import Common "common";

module {
  public type UserId = Common.UserId;
  public type Date = Common.Date;
  public type Calories = Common.Calories;
  public type MacroBreakdown = Common.MacroBreakdown;

  /// A single day's aggregated nutrition summary for a user.
  public type DailySummary = {
    date : Date;
    caloriesIn : Calories;     // sum of all meals that day
    caloriesOut : Calories;    // exercise + step calories (excludes BMR)
    netBalance : Int;          // caloriesIn - caloriesOut (can be negative)
    bmr : Calories;            // user's basal metabolic rate that day
    macroBreakdown : MacroBreakdown; // summed protein/carbs/fat from meals
    exerciseCalories : Calories; // exercise-only calories
    stepCalories : Calories;      // steps-only calories
    steps : Nat;                  // step count that day
  };

  /// A net-balance data point for trend charts over a number of days.
  public type NetBalancePoint = {
    date : Date;
    netBalance : Int;
  };
};
