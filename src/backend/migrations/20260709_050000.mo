import Map "mo:core/Map";

module {
  // First migration: introducing stable state for the first time.
  // OldActor is {} (no prior actor), NewActor enumerates every stable field
  // declared in main.mo with its initial value.
  type OldActor = {};
  type NewActor = {
    accessControlState : AccessControlState;
    users : Map.Map<Text, User>;
    pendingCodes : Map.Map<Text, PendingCode>;
    sessions : Map.Map<Text, Session>;
    profiles : Map.Map<Text, Profile>;
    meals : Map.Map<Nat, Meal>;
    mealsByUserDate : Map.Map<(Text, Text), [Nat]>;
    nextMealId : { var value : Nat };
    exercises : Map.Map<Nat, Exercise>;
    exercisesByUserDate : Map.Map<(Text, Text), [Nat]>;
    nextExerciseId : { var value : Nat };
    stepsByUserDate : Map.Map<(Text, Text), StepEntry>;
    logMealApiKey : { var value : Text };
    codeTtl : Nat;
    sessionTtl : Nat;
    maxAttempts : Nat;
  };

  // Inlined stable types (no project imports — self-contained migration).
  type UserRole = { #admin; #user; #guest };
  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };
  type User = { email : Text; createdAt : Nat; lastLoginAt : Nat };
  type PendingCode = {
    email : Text; code : Text; createdAt : Nat; expiresAt : Nat; attempts : Nat;
  };
  type Session = { token : Text; email : Text; createdAt : Nat; expiresAt : Nat };
  type Sex = { #male; #female };
  type ActivityLevel = {
    #sedentary; #lightlyActive; #moderatelyActive; #veryActive; #extraActive;
  };
  type Goal = { #lose; #maintain; #gain };
  type Profile = {
    age : Nat; sex : Sex; height : Nat; weight : Nat;
    activityLevel : ActivityLevel; goal : Goal; bmr : Nat;
  };
  type MealType = { #breakfast; #lunch; #dinner; #snack };
  type MacroBreakdown = { protein : Nat; carbs : Nat; fat : Nat };
  type Meal = {
    id : Nat; userId : Text; date : Text; mealType : MealType;
    description : Text; photo : ?Blob; portionSize : ?Text;
    calories : Nat; macros : MacroBreakdown; loggedAt : Nat;
  };
  type Intensity = { #light; #moderate; #vigorous };
  type Exercise = {
    id : Nat; userId : Text; date : Text; exerciseType : Text;
    durationMin : Nat; intensity : ?Intensity; distance : ?Nat;
    photo : ?Blob; caloriesBurned : Nat; loggedAt : Nat;
  };
  type StepEntry = {
    userId : Text; date : Text; steps : Nat; calories : Nat; updatedAt : Nat;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      users = Map.empty();
      pendingCodes = Map.empty();
      sessions = Map.empty();
      profiles = Map.empty();
      meals = Map.empty();
      mealsByUserDate = Map.empty();
      nextMealId = { var value = 0 };
      exercises = Map.empty();
      exercisesByUserDate = Map.empty();
      nextExerciseId = { var value = 0 };
      stepsByUserDate = Map.empty();
      logMealApiKey = { var value = "" };
      codeTtl = 10 * 60 * 1_000_000_000;
      sessionTtl = 24 * 60 * 60 * 1_000_000_000;
      maxAttempts = 5;
    };
  };
};
