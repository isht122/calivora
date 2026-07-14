import Float "mo:core/Float";
import Int "mo:core/Int";

import Types "../types/profile";

module {
  public type Profile = Types.Profile;

  /// Compute Basal Metabolic Rate (kcal/day) from a profile using the
  /// Mifflin-St Jeor formula:
  ///   male:   10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
  ///   female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
  /// Returns the rounded Nat value.
  public func calculateBMR(profile : Types.Profile) : Nat {
    let weight = profile.weight.toFloat();
    let height = profile.height.toFloat();
    let age = profile.age.toFloat();
    let base = 10.0 * weight + 6.25 * height - 5.0 * age;
    let raw = switch (profile.sex) {
      case (#male) base + 5.0;
      case (#female) base - 161.0;
    };
    Int.abs(Float.toInt(raw + 0.5));
  };
};
