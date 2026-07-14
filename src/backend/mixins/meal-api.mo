import Map "mo:core/Map";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import AuthTypes "../types/auth";
import AuthLib "../lib/auth";
import MealLib "../lib/meal";
import Dashboard "../lib/dashboard";
import Types "../types/meal";
import Common "../types/common";

/// Meal domain API: logging meals with LogMeal calorie estimation.
///
/// Per-user privacy: every data endpoint takes a `sessionToken` and validates
/// that the caller's session exists, is unexpired, and belongs to the
/// `userId` (email) the request targets. A mismatch traps with
/// "unauthorized". This is enforced here in addition to the OQL layer's
/// `.ownedBy("userId").controllerOrScoped()` scoping on the `meal` entity.
///
/// State slices are injected by the composition root in main.mo.
mixin (
  meals : Map.Map<Nat, Types.Meal>,
  mealsByUserDate : Map.Map<(Common.UserId, Common.Date), [Nat]>,
  nextMealId : { var value : Nat },
  logMealApiKey : { var value : Text },
  sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>,
) {
  /// Estimate calories and macros for a meal input using the LogMeal API,
  /// without saving. Returns the estimate so the user can review/edit before
  /// committing. Requires a valid session for `userId`.
  public shared func estimateMeal(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, input : Types.MealInput) : async Types.EstimateResult {
    AuthLib.requireSession(sessions, sessionToken, userId);
    await MealLib.estimateMeal(logMealApiKey.value, input.photo, ?input.description);
  };

  /// Save a meal with a (possibly user-edited) calorie/macro estimate.
  public shared func addMeal(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, input : Types.MealInput, calories : Common.Calories, macros : Common.MacroBreakdown) : async Types.Meal {
    AuthLib.requireSession(sessions, sessionToken, userId);
    let id = MealLib.saveMeal(
      meals,
      nextMealId,
      userId,
      {
        id = 0 : Nat; // assigned by saveMeal
        userId;
        date = input.date;
        mealType = input.mealType;
        description = input.description;
        photo = input.photo;
        portionSize = input.portionSize;
        calories;
        macros;
        loggedAt = Int.abs(Time.now());
      },
    );
    switch (meals.get(id)) {
      case (?m) m;
      case null {
        // Unreachable: saveMeal just inserted this id.
        {
          id;
          userId;
          date = input.date;
          mealType = input.mealType;
          description = input.description;
          photo = input.photo;
          portionSize = input.portionSize;
          calories;
          macros;
          loggedAt = Int.abs(Time.now());
        };
      };
    };
  };

  /// Edit an existing meal. The `userId` is derived from the stored meal's
  /// owner and must match the session's email.
  public shared func updateMeal(sessionToken : AuthTypes.SessionToken, mealId : Nat, input : Types.MealInput, calories : Common.Calories, macros : Common.MacroBreakdown) : async ?Types.Meal {
    switch (meals.get(mealId)) {
      case null null;
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        let updated : Types.Meal = {
          id = existing.id;
          userId = existing.userId;
          date = input.date;
          mealType = input.mealType;
          description = input.description;
          photo = input.photo;
          portionSize = input.portionSize;
          calories;
          macros;
          loggedAt = existing.loggedAt;
        };
        let ok = MealLib.updateMeal(meals, existing.userId, updated);
        if (ok) { ?updated } else { null };
      };
    };
  };

  /// Delete a meal. The `userId` is derived from the stored meal's owner and
  /// must match the session's email.
  public shared func deleteMeal(sessionToken : AuthTypes.SessionToken, mealId : Nat) : async Bool {
    switch (meals.get(mealId)) {
      case null false;
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        MealLib.deleteMeal(meals, existing.userId, mealId);
      };
    };
  };

  /// List all meals for a user on a given date.
  public query func listMeals(sessionToken : AuthTypes.SessionToken, userId : Common.UserId, date : Common.Date) : async [Types.Meal] {
    AuthLib.requireSession(sessions, sessionToken, userId);
    MealLib.getMealsByDate(meals, userId, date);
  };

  /// Retrieve a single meal by id. The `userId` is derived from the stored
  /// meal's owner and must match the session's email.
  public query func getMeal(sessionToken : AuthTypes.SessionToken, mealId : Nat) : async ?Types.Meal {
    switch (meals.get(mealId)) {
      case null null;
      case (?existing) {
        AuthLib.requireSession(sessions, sessionToken, existing.userId);
        ?existing;
      };
    };
  };
};
