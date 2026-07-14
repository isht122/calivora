import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Char "mo:core/Char";
import Dashboard "../lib/dashboard";
import Types "../types/meal";
import Common "../types/common";

module {
  /// Heuristic calorie/macro estimate from a meal's photo and/or text.
  /// At least one of `photo`/`text` is required. The LogMeal API key is
  /// accepted here so the real API call can be wired in later; for now we
  /// fall back to a keyword heuristic over the text description so the app
  /// is fully functional without external network calls.
  public func estimateMeal(
    logMealApiKey : Text,
    photo : ?Blob,
    text : ?Text,
  ) : async Types.EstimateResult {
    ignore logMealApiKey;
    // At least one input is required.
    let hasPhoto = switch (photo) { case (?_) true; case null false };
    let hasText = switch (text) { case (?_) true; case null false };
    if (not hasPhoto and not hasText) {
      return #err(#invalidInput "Photo or text description is required");
    };

    // Use the text description for keyword matching; if only a photo was
    // supplied, fall back to the default estimate.
    let desc = switch (text) { case (?t) t; case null "" };
    let lower = toLower(desc);

    let (calories, protein, carbs, fat) = if (contains(lower, "salad")) {
      (200, 10, 20, 8);
    } else if (contains(lower, "burger")) {
      (500, 25, 40, 25);
    } else if (contains(lower, "pizza")) {
      (285, 12, 36, 10);
    } else if (contains(lower, "chicken")) {
      (350, 30, 10, 15);
    } else if (contains(lower, "pasta")) {
      (400, 15, 55, 12);
    } else if (contains(lower, "rice")) {
      (250, 5, 50, 3);
    } else {
      (350, 15, 45, 12);
    };

    #ok({
      calories;
      macros = { protein; carbs; fat };
    });
  };

  /// Persists a meal for `userId`, assigning the next id.
  public func saveMeal(
    meals : Map.Map<Nat, Types.Meal>,
    nextMealId : { var value : Nat },
    userId : Common.UserId,
    meal : Types.Meal,
  ) : Nat {
    let id = nextMealId.value;
    nextMealId.value += 1;
    let fullMeal : Types.Meal = {
      meal with
      id;
      userId;
    };
    meals.add(id, fullMeal);
    id;
  };

  /// Returns every meal logged by `userId` on the given `date`.
  public func getMealsByDate(
    meals : Map.Map<Nat, Types.Meal>,
    userId : Common.UserId,
    date : Common.Date,
  ) : [Types.Meal] {
    meals.toArray().filterMap(
      func((_id, entry)) { if (entry.userId == userId and entry.date == date) ?entry else null },
    );
  };

  /// Returns every meal logged by `userId` for today's calendar date.
  public func getTodayMeals(
    meals : Map.Map<Nat, Types.Meal>,
    userId : Common.UserId,
  ) : [Types.Meal] {
    let today = Dashboard.todayFromNs(Time.now());
    getMealsByDate(meals, userId, today);
  };

  /// Replaces the stored meal identified by `meal.id` if it belongs to
  /// `userId`. Returns `true` on success, `false` if not found or not owned.
  public func updateMeal(
    meals : Map.Map<Nat, Types.Meal>,
    userId : Common.UserId,
    meal : Types.Meal,
  ) : Bool {
    switch (meals.get(meal.id)) {
      case null false;
      case (?existing) {
        if (existing.userId != userId) { return false };
        meals.add(meal.id, meal);
        true;
      };
    };
  };

  /// Removes the meal `id` if it belongs to `userId`.
  /// Returns `true` on success, `false` if not found or not owned.
  public func deleteMeal(
    meals : Map.Map<Nat, Types.Meal>,
    userId : Common.UserId,
    id : Nat,
  ) : Bool {
    switch (meals.get(id)) {
      case null false;
      case (?existing) {
        if (existing.userId != userId) { return false };
        meals.remove(id);
        true;
      };
    };
  };

  // ── Text helpers (avoid pulling in a regex lib for keyword matching) ─────────

  func toLower(t : Text) : Text {
    t.map(func(c : Char) : Char {
      if (c >= 'A' and c <= 'Z') {
        Char.fromNat32(c.toNat32() + 32);
      } else { c };
    });
  };

  func contains(haystack : Text, needle : Text) : Bool {
    haystack.contains(#text needle);
  };
};
