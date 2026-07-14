import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Char "mo:core/Char";
import Types "../types/dashboard";
import MealTypes "../types/meal";
import ExerciseTypes "../types/exercise";
import StepTypes "../types/steps";
import Common "../types/common";

module {
  public type DailySummary = Types.DailySummary;
  public type NetBalancePoint = Types.NetBalancePoint;

  // ── Date helpers (ISO 8601 YYYY-MM-DD) ─────────────────────────────────────
  // We use a proleptic Gregorian day number so we can add/subtract days and
  // compare dates with Nat.compare. No external date library is available in
  // mo:core, so this is the minimal self-contained arithmetic.

  /// Parse a "YYYY-MM-DD" string into its year/month/day components.
  /// Returns null on malformed input.
  public func parseDate(date : Common.Date) : ?{ year : Nat; month : Nat; day : Nat } {
    let parts = date.split(#char '-').toArray();
    if (parts.size() != 3) { return null };
    let ?year = Nat.fromText(parts[0]) else return null;
    let ?month = Nat.fromText(parts[1]) else return null;
    let ?day = Nat.fromText(parts[2]) else return null;
    ?{ year; month; day };
  };

  /// Convert a (year, month, day) to a proleptic Gregorian day number.
  /// Algorithm: Howard Hinnant's `days_from_civil` (valid for any year).
  public func toDayNumber(year : Nat, month : Nat, day : Nat) : Nat {
    let y = if (month <= 2) { year - 1 : Nat } else { year };
    let era = (if (y >= 0) { y } else { y - 399 }) / 400;
    let yoe = y - era * 400; // [0, 399]
    let doy = (153 * (if (month > 2) { month - 3 : Nat } else { month + 9 }) + 2) / 5 + day - 1; // [0, 365]
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy; // [0, 146096]
    era * 146097 + doe - 719468;
  };

  /// Convert a proleptic Gregorian day number back to (year, month, day).
  /// Inverse of `toDayNumber`.
  public func fromDayNumber(z : Int) : { year : Nat; month : Nat; day : Nat } {
    let z2 = z + 719468;
    let era = (if (z2 >= 0) { z2 } else { z2 - 146096 }) / 146097;
    let doe = z2 - era * 146097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if (mp < 10) { mp + 3 } else { mp - 9 }; // [1, 12]
    let year = if (m <= 2) { y + 1 } else { y };
    { year = year.toNat(); month = m.toNat(); day = d.toNat() };
  };

  /// Format a (year, month, day) as "YYYY-MM-DD" with zero-padding.
  public func formatDate(year : Nat, month : Nat, day : Nat) : Common.Date {
    pad4(year) # "-" # pad2(month) # "-" # pad2(day);
  };

  /// Add `n` days to an ISO date string, returning the resulting ISO date.
  public func addDays(date : Common.Date, n : Int) : Common.Date {
    let ?p = parseDate(date) else return date; // malformed: pass through
    let dayNum = toDayNumber(p.year, p.month, p.day);
    let r = fromDayNumber(dayNum + n);
    formatDate(r.year, r.month, r.day);
  };

  /// Today's date as "YYYY-MM-DD", derived from a nanosecond timestamp.
  public func todayFromNs(nowNs : Int) : Common.Date {
    // Days since 1970-01-01 civil epoch. toDayNumber(1970,1,1) = 719468.
    let daysSinceUnixEpoch = nowNs / 86_400_000_000_000;
    let r = fromDayNumber(719468 + daysSinceUnixEpoch);
    formatDate(r.year, r.month, r.day);
  };

  func pad2(n : Nat) : Text = if (n < 10) { "0" # n.toText() } else { n.toText() };
  func pad4(n : Nat) : Text =
    if (n < 10) { "000" # n.toText() }
    else if (n < 100) { "00" # n.toText() }
    else if (n < 1000) { "0" # n.toText() }
    else { n.toText() };

  // ── Aggregation ────────────────────────────────────────────────────────────

  /// Build a DailySummary for a user on a given date from their meals,
  /// exercises, step entry, and BMR.
  public func buildDailySummary(
    date : Common.Date,
    meals : [MealTypes.Meal],
    exercises : [ExerciseTypes.Exercise],
    steps : ?StepTypes.StepEntry,
    bmr : Common.Calories,
  ) : DailySummary {
    var caloriesIn = 0 : Nat;
    var protein = 0 : Nat;
    var carbs = 0 : Nat;
    var fat = 0 : Nat;
    for (m in meals.vals()) {
      caloriesIn += m.calories;
      protein += m.macros.protein;
      carbs += m.macros.carbs;
      fat += m.macros.fat;
    };

    var exerciseCalories = 0 : Nat;
    for (e in exercises.vals()) {
      exerciseCalories += e.caloriesBurned;
    };

    let stepCount = switch (steps) { case (?s) s.steps; case null 0 };
    let stepCalories = switch (steps) { case (?s) s.calories; case null 0 };

    let caloriesOut = exerciseCalories + stepCalories;
    let netBalance : Int = caloriesIn - caloriesOut;

    {
      date;
      caloriesIn;
      caloriesOut;
      netBalance;
      bmr;
      macroBreakdown = { protein; carbs; fat };
      exerciseCalories;
      stepCalories;
      steps = stepCount;
    };
  };

  /// Build a list of DailySummary entries for a date range (inclusive).
  /// Days with no logged data still appear with zeroed totals.
  public func buildHistoryRange(
    startDate : Common.Date,
    endDate : Common.Date,
    mealsByDate : [(Common.Date, [MealTypes.Meal])],
    exercisesByDate : [(Common.Date, [ExerciseTypes.Exercise])],
    stepsByDate : [(Common.Date, ?StepTypes.StepEntry)],
    bmr : Common.Calories,
  ) : [DailySummary] {
    let ?s = parseDate(startDate) else return [];
    let ?e = parseDate(endDate) else return [];
    let startDay = toDayNumber(s.year, s.month, s.day);
    let endDay = toDayNumber(e.year, e.month, e.day);
    if (endDay < startDay) { return [] };

    // Walk each day in the range; look up its meals/exercises/steps by date key.
    Array.tabulate(endDay - startDay + 1, func(i) {
      let dayNum = startDay + i : Nat;
      let r = fromDayNumber(dayNum);
      let date = formatDate(r.year, r.month, r.day);

      let meals = lookupMeals(date, mealsByDate);
      let exercises = lookupExercises(date, exercisesByDate);
      let steps = lookupSteps(date, stepsByDate);
      buildDailySummary(date, meals, exercises, steps, bmr);
    });
  };

  /// Build a net-balance trend over the last `days` days, ending at `endDate`.
  /// Returns one NetBalancePoint per day, oldest first.
  public func buildNetBalanceTrend(
    days : Nat,
    endDate : Common.Date,
    summaries : [DailySummary],
  ) : [NetBalancePoint] {
    if (days == 0) { return [] };
    let start = addDays(endDate, -(days - 1 : Int));
    // summaries is expected to be the inclusive range [start .. endDate];
    // take the first `days` entries (oldest first) and project to points.
    let count = if (summaries.size() < days) { summaries.size() } else { days };
    Array.tabulate(count, func(i) {
      let s = summaries[i];
      { date = s.date; netBalance = s.netBalance };
    });
  };

  // ── Lookup helpers (linear scan; ranges are small) ─────────────────────────

  func lookupMeals(date : Common.Date, byDate : [(Common.Date, [MealTypes.Meal])]) : [MealTypes.Meal] {
    switch (byDate.find(func((d, _)) = d == date)) {
      case (?(_, ms)) ms;
      case null [];
    };
  };

  func lookupExercises(date : Common.Date, byDate : [(Common.Date, [ExerciseTypes.Exercise])]) : [ExerciseTypes.Exercise] {
    switch (byDate.find(func((d, _)) = d == date)) {
      case (?(_, es)) es;
      case null [];
    };
  };

  func lookupSteps(date : Common.Date, byDate : [(Common.Date, ?StepTypes.StepEntry)]) : ?StepTypes.StepEntry {
    switch (byDate.find(func((d, _)) = d == date)) {
      case (?(_, s)) s;
      case null null;
    };
  };
};
