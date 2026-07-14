import Float "mo:core/Float";
import Int "mo:core/Int";

import Types "../types/steps";
import Common "../types/common";

module {
  public type StepEntry = Types.StepEntry;

  /// Convert a step count to calories burned using ~0.04–0.05 kcal/step,
  /// scaled by the user's weight in kg.
  ///   calories = 0.045 * steps * (weightKg / 70)
  /// Rounded to Nat via Int.abs(Float.round(...)).
  public func stepsToCalories(steps : Nat, weightKg : Nat) : Common.Calories {
    let raw = 0.045 * steps.toFloat() * (weightKg.toFloat() / 70.0);
    Int.abs(Float.toInt(raw + 0.5));
  };

  /// Create or update a StepEntry for a (user, date) pair. The latest value
  /// for the day wins. Calories are derived from steps and weight.
  public func upsertStepEntry(userId : Common.UserId, date : Common.Date, steps : Nat, weightKg : Nat, now : Common.Timestamp) : StepEntry {
    let calories = stepsToCalories(steps, weightKg);
    {
      userId;
      date;
      steps;
      calories;
      updatedAt = now;
    };
  };
};
