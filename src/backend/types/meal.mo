import Common "common";

module {
  public type UserId = Common.UserId;
  public type Date = Common.Date;
  public type MealType = Common.MealType;
  public type Timestamp = Common.Timestamp;
  public type Calories = Common.Calories;
  public type MacroBreakdown = Common.MacroBreakdown;

  /// A meal entry logged by a user. The photo and/or text description is sent
  /// to the LogMeal API to estimate calories and macros; the estimate is
  /// editable before saving.
  public type Meal = {
    id : Nat;
    userId : UserId;
    date : Date;            // YYYY-MM-DD the meal belongs to
    mealType : MealType;
    description : Text;     // user-typed description (required if no photo)
    photo : ?Blob;          // optional photo attachment
    portionSize : ?Text;    // optional free-text portion (e.g. "1 cup")
    calories : Calories;    // estimated kcal (editable before save)
    macros : MacroBreakdown; // estimated protein/carbs/fat in grams
    loggedAt : Timestamp;   // when the meal was saved
  };

  /// Input for creating/editing a meal before the LogMeal estimate is applied.
  public type MealInput = {
    date : Date;
    mealType : MealType;
    description : Text;
    photo : ?Blob;
    portionSize : ?Text;
  };

  /// Result of requesting a LogMeal calorie/macro estimate for a meal input.
  public type EstimateResult = {
    #ok : { calories : Calories; macros : MacroBreakdown };
    #err : Common.Error;
  };
};
