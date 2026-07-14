import Float "mo:core/Float";
import Int "mo:core/Int";
import Array "mo:core/Array";

import Types "../types/exercise";
import Common "../types/common";

module {
  public type Exercise = Types.Exercise;
  public type ExerciseInput = Types.ExerciseInput;
  public type EstimateResult = Types.EstimateResult;
  public type Intensity = Types.Intensity;

  /// MET (metabolic equivalent of task) values for common exercises.
  /// Unknown exercise types fall back to a moderate default of 5.0.
  public func metFor(exerciseType : Text) : Float {
    switch (exerciseType) {
      case "walking" 3.5;
      case "Walking" 3.5;
      case "running" 9.8;
      case "Running" 9.8;
      case "cycling" 7.5;
      case "Cycling" 7.5;
      case "swimming" 8.0;
      case "Swimming" 8.0;
      case "weightlifting" 6.0;
      case "Weightlifting" 6.0;
      case "yoga" 3.0;
      case "Yoga" 3.0;
      case "hiit" 8.0;
      case "HIIT" 8.0;
      case "dancing" 5.0;
      case "Dancing" 5.0;
      case "hiking" 6.0;
      case "Hiking" 6.0;
      case "basketball" 6.5;
      case "Basketball" 6.5;
      case _ 5.0;
    };
  };

  /// Intensity adjustment factor applied to the MET-based estimate.
  public func intensityFactor(intensity : ?Intensity) : Float {
    switch (intensity) {
      case (?#light) 0.85;
      case (?#moderate) 1.0;
      case (?#vigorous) 1.15;
      case null 1.0;
    };
  };

  /// Estimate calories burned for an exercise input using
  ///   calories = MET × weight(kg) × duration(h) × intensityFactor
  /// Returns the rounded Nat kcal value wrapped in `#ok`.
  public func estimateCaloriesBurned(input : ExerciseInput, weightKg : Nat) : EstimateResult {
    let met = metFor(input.exerciseType);
    let factor = intensityFactor(input.intensity);
    let durationHours = input.durationMin.toFloat() / 60.0;
    let raw = met * weightKg.toFloat() * durationHours * factor;
    let caloriesBurned : Common.Calories = Int.abs(Float.toInt(raw + 0.5));
    #ok({ caloriesBurned });
  };

  /// Create a new Exercise record from an input plus its estimate.
  public func createExercise(id : Nat, userId : Common.UserId, input : ExerciseInput, caloriesBurned : Common.Calories, loggedAt : Common.Timestamp) : Exercise {
    {
      id;
      userId;
      date = input.date;
      exerciseType = input.exerciseType;
      durationMin = input.durationMin;
      intensity = input.intensity;
      distance = input.distance;
      photo = input.photo;
      caloriesBurned;
      loggedAt;
    };
  };

  /// Apply edits to an existing exercise, preserving its id, owner, and
  /// original `loggedAt`. Recomputes nothing — the caller supplies the new
  /// calorie estimate.
  public func applyEdit(exercise : Exercise, input : ExerciseInput, caloriesBurned : Common.Calories) : Exercise {
    {
      exercise with
      date = input.date;
      exerciseType = input.exerciseType;
      durationMin = input.durationMin;
      intensity = input.intensity;
      distance = input.distance;
      photo = input.photo;
      caloriesBurned;
    };
  };

  /// Sum the calories burned across a list of exercises.
  public func sumCaloriesBurned(exercises : [Exercise]) : Common.Calories {
    exercises.foldLeft(
      0,
      func(acc, e) = acc + e.caloriesBurned,
    );
  };
};
