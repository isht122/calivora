module {
  /// Biological sex, used by the Mifflin-St Jeor BMR formula.
  public type Sex = {
    #male;
    #female;
  };

  /// Self-reported daily activity level. Multiplies BMR to estimate TDEE.
  public type ActivityLevel = {
    #sedentary;
    #lightlyActive;
    #moderatelyActive;
    #veryActive;
    #extraActive;
  };

  /// User's weight-management goal.
  public type Goal = {
    #lose;
    #maintain;
    #gain;
  };

  /// Per-user nutrition profile. `bmr` is computed from the other fields
  /// using the Mifflin-St Jeor formula and stored alongside so calorie
  /// calculations can use the latest weight without re-deriving each call.
  public type Profile = {
    age : Nat;            // years
    sex : Sex;
    height : Nat;         // cm
    weight : Nat;         // kg
    activityLevel : ActivityLevel;
    goal : Goal;
    bmr : Nat;            // kcal/day, Mifflin-St Jeor
  };
};
