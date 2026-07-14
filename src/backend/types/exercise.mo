import Common "common";

module {
  public type UserId = Common.UserId;
  public type Date = Common.Date;
  public type Timestamp = Common.Timestamp;
  public type Calories = Common.Calories;

  /// Exercise intensity, used to adjust the MET-based calorie burn estimate.
  public type Intensity = {
    #light;
    #moderate;
    #vigorous;
  };

  /// An exercise entry logged by a user. Calories burned are estimated from
  /// MET values × user weight × duration, adjusted for intensity.
  public type Exercise = {
    id : Nat;
    userId : UserId;
    date : Date;            // YYYY-MM-DD the exercise belongs to
    exerciseType : Text;    // e.g. "running", "cycling", "yoga"
    durationMin : Nat;      // minutes
    intensity : ?Intensity; // optional intensity adjustment
    distance : ?Nat;        // optional distance in meters
    photo : ?Blob;          // optional photo attachment
    caloriesBurned : Calories; // estimated kcal burned
    loggedAt : Timestamp;   // when the exercise was saved
  };

  /// Input for creating/editing an exercise before the MET estimate is applied.
  public type ExerciseInput = {
    date : Date;
    exerciseType : Text;
    durationMin : Nat;
    intensity : ?Intensity;
    distance : ?Nat;
    photo : ?Blob;
  };

  /// Result of requesting a MET-based calorie burn estimate for an exercise input.
  public type EstimateResult = {
    #ok : { caloriesBurned : Calories };
    #err : Common.Error;
  };
};
