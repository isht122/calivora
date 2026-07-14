import Common "common";

module {
  public type UserId = Common.UserId;
  public type Date = Common.Date;
  public type Timestamp = Common.Timestamp;
  public type Calories = Common.Calories;

  /// A step-count entry for a user on a given date. The latest value for a
  /// (user, date) pair wins — editing during the day overwrites the prior entry.
  /// Calories are derived from steps using ~0.04–0.05 kcal/step scaled by weight.
  public type StepEntry = {
    userId : UserId;
    date : Date;        // YYYY-MM-DD
    steps : Nat;        // step count
    calories : Calories; // derived kcal burned from steps
    updatedAt : Timestamp;
  };
};
