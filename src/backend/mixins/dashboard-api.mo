import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";

import Types "../types/dashboard";
import Common "../types/common";
import MealTypes "../types/meal";
import ExerciseTypes "../types/exercise";
import StepTypes "../types/steps";
import ProfileTypes "../types/profile";
import AuthTypes "../types/auth";
import AuthLib "../lib/auth";

import Dashboard "../lib/dashboard";

/// Dashboard domain API: daily summaries and history aggregation.
///
/// Per-user privacy: every data endpoint takes a `sessionToken` and validates
/// that the caller's session exists, is unexpired, and belongs to the
/// `userId` (email) the request targets. A mismatch traps with
/// "unauthorized". This is enforced here in addition to the OQL layer's
/// `.ownedBy("userId").controllerOrScoped()` scoping on every entity.
///
/// State slices are injected by the composition root in main.mo.
mixin (
  meals : Map.Map<Nat, MealTypes.Meal>,
  exercises : Map.Map<Nat, ExerciseTypes.Exercise>,
  mealsByUserDate : Map.Map<(Common.UserId, Common.Date), [Nat]>,
  exercisesByUserDate : Map.Map<(Common.UserId, Common.Date), [Nat]>,
  stepsByUserDate : Map.Map<(Common.UserId, Common.Date), StepTypes.StepEntry>,
  profiles : Map.Map<Common.UserId, ProfileTypes.Profile>,
  sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>,
) {

  /// Get the full daily summary for a user on a given date:
  /// caloriesIn, caloriesOut, netBalance, bmr, macroBreakdown.
  public query func getDailySummary(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, date : Common.Date) : async Types.DailySummary {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let mealIds = switch (mealsByUserDate.get(Common.compareUserDate, (userId, date))) { case (?ms) ms; case null [] };
    let exerciseIds = switch (exercisesByUserDate.get(Common.compareUserDate, (userId, date))) { case (?es) es; case null [] };
    let dayMeals = mealIds.filterMap(func(id) = meals.get(id));
    let dayExercises = exerciseIds.filterMap(func(id) = exercises.get(id));
    let steps = stepsByUserDate.get(Common.compareUserDate, (userId, date));
    let bmr = userBmr(userId);
    Dashboard.buildDailySummary(date, dayMeals, dayExercises, steps, bmr);
  };

  /// Get daily summaries for a date range (inclusive). Days with no logged
  /// data appear with zeroed totals.
  public query func getHistoryRange(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, startDate : Common.Date, endDate : Common.Date) : async [Types.DailySummary] {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let mealsByDate = collectForRange(userId, startDate, endDate, mealsByUserDate, meals);
    let exercisesByDate = collectForRange(userId, startDate, endDate, exercisesByUserDate, exercises);
    let stepsByDate = collectStepsForRange(userId, startDate, endDate, stepsByUserDate);
    let bmr = userBmr(userId);
    Dashboard.buildHistoryRange(startDate, endDate, mealsByDate, exercisesByDate, stepsByDate, bmr);
  };

  /// Get the net calorie balance trend over the last `days` days ending at
  /// today. Returns one NetBalancePoint per day, oldest first.
  public query func getNetBalanceTrend(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, days : Nat) : async [Types.NetBalancePoint] {
    AuthLib.requireSession(sessions, sessionToken, userId);
    if (days == 0) { return [] };
    let endDate = Dashboard.todayFromNs(Time.now());
    let startDate = Dashboard.addDays(endDate, -(days - 1 : Int));
    // Inline the history-range logic (cannot await a shared func from a query).
    let mealsByDate = collectForRange(userId, startDate, endDate, mealsByUserDate, meals);
    let exercisesByDate = collectForRange(userId, startDate, endDate, exercisesByUserDate, exercises);
    let stepsByDate = collectStepsForRange(userId, startDate, endDate, stepsByUserDate);
    let bmr = userBmr(userId);
    let summaries = Dashboard.buildHistoryRange(startDate, endDate, mealsByDate, exercisesByDate, stepsByDate, bmr);
    Dashboard.buildNetBalanceTrend(days, endDate, summaries);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /// Look up the user's stored BMR from their profile, defaulting to 0 when
  /// no profile exists yet (e.g. before onboarding completes).
  func userBmr(userId : Common.UserId) : Common.Calories =
    switch (profiles.get(userId)) {
      case (?p) p.bmr;
      case null 0;
    };

  /// Collect (date, items) pairs for every day in [startDate, endDate] that has
  /// entries for this user in the given per-(user,date) ID-index map. Each ID is
  /// resolved to a record via the lookup map; missing IDs are filtered out.
  func collectForRange<T>(
    userId : Common.UserId,
    startDate : Common.Date,
    endDate : Common.Date,
    store : Map.Map<(Common.UserId, Common.Date), [Nat]>,
    lookup : Map.Map<Nat, T>,
  ) : [(Common.Date, [T])] {
    let ?s = Dashboard.parseDate(startDate) else return [];
    let ?e = Dashboard.parseDate(endDate) else return [];
    let startDay = Dashboard.toDayNumber(s.year, s.month, s.day);
    let endDay = Dashboard.toDayNumber(e.year, e.month, e.day);
    if (endDay < startDay) { return [] };

    Array.tabulate(
      endDay - startDay + 1,
      func(i) {
        let dayNum = startDay + i : Nat;
        let r = Dashboard.fromDayNumber(dayNum);
        let date = Dashboard.formatDate(r.year, r.month, r.day);
        let ids = switch (store.get(Common.compareUserDate, (userId, date))) { case (?xs) xs; case null [] };
        let items = ids.filterMap(func(id) = lookup.get(id));
        (date, items);
      },
    );
  };

  /// Same as collectForRange but for the single-entry steps map (value is a
  /// bare StepEntry, not an array).
  func collectStepsForRange(
    userId : Common.UserId,
    startDate : Common.Date,
    endDate : Common.Date,
    store : Map.Map<(Common.UserId, Common.Date), StepTypes.StepEntry>,
  ) : [(Common.Date, ?StepTypes.StepEntry)] {
    let ?s = Dashboard.parseDate(startDate) else return [];
    let ?e = Dashboard.parseDate(endDate) else return [];
    let startDay = Dashboard.toDayNumber(s.year, s.month, s.day);
    let endDay = Dashboard.toDayNumber(e.year, e.month, e.day);
    if (endDay < startDay) { return [] };

    Array.tabulate(
      endDay - startDay + 1,
      func(i) {
        let dayNum = startDay + i : Nat;
        let r = Dashboard.fromDayNumber(dayNum);
        let date = Dashboard.formatDate(r.year, r.month, r.day);
        let entry = store.get(Common.compareUserDate, (userId, date));
        (date, entry);
      },
    );
  };
};
