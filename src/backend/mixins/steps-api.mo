import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";

import Types "../types/steps";
import Common "../types/common";
import ProfileTypes "../types/profile";
import AuthTypes "../types/auth";
import AuthLib "../lib/auth";
import StepLib "../lib/steps";
import DashboardLib "../lib/dashboard";

/// Steps domain API: daily step count entry (latest value wins).
///
/// Per-user privacy: every data endpoint takes a `sessionToken` and validates
/// that the caller's session exists, is unexpired, and belongs to the
/// `userId` (email) the request targets. A mismatch traps with
/// "unauthorized". This is enforced here in addition to the OQL layer's
/// `.ownedBy("userId").controllerOrScoped()` scoping on the `step` entity.
///
/// State slices are injected by the composition root in main.mo.
mixin (
  stepsByUserDate : Map.Map<(Common.UserId, Common.Date), Types.StepEntry>,
  profiles : Map.Map<Common.UserId, ProfileTypes.Profile>,
  sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>,
) {

  /// Set the step count for the current user on a given date. Overwrites any
  /// prior entry for that day (latest value wins). Calories are derived from
  /// steps using ~0.045 kcal/step scaled by the user's weight from their
  /// profile. Returns `#err #notFound` if the user has no profile yet.
  public shared func setSteps(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, date : Common.Date, stepCount : Nat) : async Types.StepEntry {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let ?profile = profiles.get(userId) else Runtime.trap("Profile not found");
    let entry = StepLib.upsertStepEntry(userId, date, stepCount, profile.weight, Int.abs(Time.now()));
    stepsByUserDate.add(Common.compareUserDate, (userId, date), entry);
    entry;
  };

  /// Retrieve the step entry for a user on a given date, or null if none.
  public query func getSteps(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, date : Common.Date) : async ?Types.StepEntry {
    AuthLib.requireSession(sessions, sessionToken, userId);
    stepsByUserDate.get(Common.compareUserDate, (userId, date));
  };

  /// Retrieve the step entry for the current user for today, or null if none.
  /// Today's date is derived from the current wall-clock time.
  public query func getTodaySteps(sessionToken : AuthTypes.SessionToken, userId : Common.UserId) : async ?Types.StepEntry {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let today = DashboardLib.todayFromNs(Time.now());
    stepsByUserDate.get(Common.compareUserDate, (userId, today));
  };
};
