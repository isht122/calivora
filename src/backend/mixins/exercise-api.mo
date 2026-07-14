import Map "mo:core/Map";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Text "mo:core/Text";

import Types "../types/exercise";
import Common "../types/common";
import ProfileTypes "../types/profile";
import AuthTypes "../types/auth";
import AuthLib "../lib/auth";
import ExerciseLib "../lib/exercise";

/// Exercise domain API: logging exercises with MET-based calorie estimation.
///
/// Per-user privacy: every data endpoint takes a `sessionToken` and validates
/// that the caller's session exists, is unexpired, and belongs to the
/// `userId` (email) the request targets. A mismatch traps with
/// "unauthorized". This is enforced here in addition to the OQL layer's
/// `.ownedBy("userId").controllerOrScoped()` scoping on the `exercise` entity.
///
/// State slices are injected by the composition root in main.mo.
mixin (
  exercises : Map.Map<Nat, Types.Exercise>,
  exercisesByUserDate : Map.Map<(Common.UserId, Common.Date), [Nat]>,
  nextExerciseId : { var value : Nat },
  profiles : Map.Map<Common.UserId, ProfileTypes.Profile>,
  sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>,
) {

  /// Estimate calories burned for an exercise input using MET values × the
  /// user's stored weight × duration, adjusted for intensity. Does not save.
  /// Returns `#err #notFound` if the user has no profile yet (no weight).
  public shared func estimateExercise(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, input : Types.ExerciseInput) : async Types.EstimateResult {
    AuthLib.requireSession(sessions, sessionToken, userId);
    switch (profiles.get(userId)) {
      case (?profile) ExerciseLib.estimateCaloriesBurned(input, profile.weight);
      case null #err(#notFound);
    };
  };

  /// Save an exercise with a (possibly user-edited) calorie estimate.
  /// Assigns the next exercise id, stores the record, and indexes it under
  /// (userId, date). Returns the saved exercise.
  public shared func addExercise(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, input : Types.ExerciseInput, caloriesBurned : Common.Calories) : async Types.Exercise {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let id = nextExerciseId.value;
    nextExerciseId.value := id + 1;
    let exercise = ExerciseLib.createExercise(id, userId, input, caloriesBurned, Int.abs(Time.now()));
    exercises.add(id, exercise);
    let key = (userId, input.date);
    let existing = switch (exercisesByUserDate.get(Common.compareUserDate, key)) {
      case (?ids) ids;
      case null [];
    };
    exercisesByUserDate.add(Common.compareUserDate, key, existing.concat([id]));
    exercise;
  };

  /// Edit an existing exercise. Ownership is derived from the stored record's
  /// userId (matching the meal-api pattern). Returns the updated exercise, or
  /// null if not found.
  public shared func updateExercise(sessionToken : AuthTypes.SessionToken, exerciseId : Nat, input : Types.ExerciseInput, caloriesBurned : Common.Calories) : async ?Types.Exercise {
    switch (exercises.get(exerciseId)) {
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        let userId = existing.userId;
        // If the date changed, re-index under the new (userId, date) bucket.
        if (existing.date != input.date) {
          let oldKey = (userId, existing.date);
          switch (exercisesByUserDate.get(Common.compareUserDate, oldKey)) {
            case (?ids) {
              let filtered = ids.filter(func(i) = i != exerciseId);
              exercisesByUserDate.add(Common.compareUserDate, oldKey, filtered);
            };
            case null {};
          };
          let newKey = (userId, input.date);
          let newExisting = switch (exercisesByUserDate.get(Common.compareUserDate, newKey)) {
            case (?ids) ids;
            case null [];
          };
          exercisesByUserDate.add(Common.compareUserDate, newKey, newExisting.concat([exerciseId]));
        };
        let updated = ExerciseLib.applyEdit(existing, input, caloriesBurned);
        exercises.add(exerciseId, updated);
        ?updated;
      };
      case null null;
    };
  };

  /// Delete an exercise. Ownership is derived from the stored record's userId
  /// (matching the meal-api pattern). Returns true on success, false if not found.
  public shared func deleteExercise(sessionToken : AuthTypes.SessionToken, exerciseId : Nat) : async Bool {
    switch (exercises.get(exerciseId)) {
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        let userId = existing.userId;
        exercises.remove(exerciseId);
        let key = (userId, existing.date);
        switch (exercisesByUserDate.get(Common.compareUserDate, key)) {
          case (?ids) {
            let filtered = ids.filter(func(i) = i != exerciseId);
            exercisesByUserDate.add(Common.compareUserDate, key, filtered);
          };
          case null {};
        };
        true;
      };
      case null false;
    };
  };

  /// List all exercises for a user on a given date.
  public query func listExercises(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, date : Common.Date) : async [Types.Exercise] {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let key = (userId, date);
    switch (exercisesByUserDate.get(Common.compareUserDate, key)) {
      case (?ids) {
        ids.filterMap(
          func(i) = exercises.get(i),
        );
      };
      case null [];
    };
  };

  /// Retrieve a single exercise by id. The `userId` is derived from the
  /// stored record's owner and must match the session's email.
  public query func getExercise(sessionToken : AuthTypes.SessionToken, exerciseId : Nat) : async ?Types.Exercise {
    switch (exercises.get(exerciseId)) {
      case null null;
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        ?existing;
      };
    };
  };
};
