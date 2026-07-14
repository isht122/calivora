import Text "mo:core/Text";
import Order "mo:core/Order";

module {
  /// A user's email address — the unique identity key for this app.
  /// Email-based OTP login means the email IS the user id.
  public type UserId = Text;

  /// A calendar date in ISO 8601 `YYYY-MM-DD` format (e.g. "2026-07-09").
  /// Used to group meals, exercises, and steps into daily buckets.
  public type Date = Text;

  /// Meal category chosen by the user when logging a meal.
  public type MealType = {
    #breakfast;
    #lunch;
    #dinner;
    #snack;
  };

  /// Self-reported daily activity level. Multiplies BMR to estimate TDEE.
  /// (Mirrors types/profile.mo ActivityLevel; re-exported here as a shared
  /// cross-cutting type so lib modules don't need to depend on the profile
  /// domain module.)
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

  /// Biological sex, used by the Mifflin-St Jeor BMR formula.
  public type Sex = {
    #male;
    #female;
  };

  /// A timestamp in nanoseconds since epoch (matches Time.now()).
  public type Timestamp = Nat;

  /// Generic result wrapper used across domains.
  public type Result<T> = {
    #ok : T;
    #err : Error;
  };

  /// Generic error variant used across domains.
  public type Error = {
    #notFound;
    #unauthorized;
    #invalidInput : Text;
    #rateLimited;
    #internal : Text;
  };

  /// Macronutrient breakdown (grams) for a meal or daily total.
  public type MacroBreakdown = {
    protein : Nat;   // grams
    carbs : Nat;      // grams
    fat : Nat;        // grams
  };

  /// Calories expressed in kilocalories (kcal).
  public type Calories = Nat;

  /// Compare (UserId, Date) tuples lexicographically. Both components are
  /// Text. Required because Map operations on tuple-keyed maps need an
  /// explicit compare function. Centralised here so every domain mixin can
  /// share one definition instead of redeclaring it (which would collide
  /// when the mixins are `include`d into the same actor).
  public func compareUserDate(a : (UserId, Date), b : (UserId, Date)) : Order.Order {
    let c1 = Text.compare(a.0, b.0);
    if (c1 != #equal) return c1;
    Text.compare(a.1, b.1);
  };
};
