import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";

import AuthTypes "types/auth";
import ProfileTypes "types/profile";
import MealTypes "types/meal";
import ExerciseTypes "types/exercise";
import StepTypes "types/steps";
import CommonTypes "types/common";

import AuthApi "mixins/auth-api";
import ProfileApi "mixins/profile-api";
import MealApi "mixins/meal-api";
import ExerciseApi "mixins/exercise-api";
import StepsApi "mixins/steps-api";
import DashboardApi "mixins/dashboard-api";
import AdminApi "mixins/admin-api";

actor {
  // ── Authorization state (existing) ────────────────────────────────────────
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // ── Data viewer (existing) ─────────────────────────────────────────────────
  include MixinViews();

  // ── Object storage (for photo attachments) ─────────────────────────────────
  include MixinObjectStorage();

  // ── Auth domain state ──────────────────────────────────────────────────────
  let users : Map.Map<AuthTypes.Email, AuthTypes.User>;
  let pendingCodes : Map.Map<AuthTypes.Email, AuthTypes.PendingCode>;
  let sessions : Map.Map<AuthTypes.SessionToken, AuthTypes.Session>;

  // ── Auth config (stable, hoisted from mixin so they persist across upgrades) ─
  let codeTtl : AuthTypes.CodeTtl;
  let sessionTtl : AuthTypes.SessionTtl;
  let maxAttempts : Nat;

  // ── Profile domain state ───────────────────────────────────────────────────
  let profiles : Map.Map<CommonTypes.UserId, ProfileTypes.Profile>;

  // ── Meal domain state ──────────────────────────────────────────────────────
  let meals : Map.Map<Nat, MealTypes.Meal>;
  let mealsByUserDate : Map.Map<(CommonTypes.UserId, CommonTypes.Date), [Nat]>;
  let nextMealId : { var value : Nat };

  // ── Exercise domain state ─────────────────────────────────────────────────
  let exercises : Map.Map<Nat, ExerciseTypes.Exercise>;
  let exercisesByUserDate : Map.Map<(CommonTypes.UserId, CommonTypes.Date), [Nat]>;
  let nextExerciseId : { var value : Nat };

  // ── Steps domain state ────────────────────────────────────────────────────
  let stepsByUserDate : Map.Map<(CommonTypes.UserId, CommonTypes.Date), StepTypes.StepEntry>;

  // ── Admin / config state ──────────────────────────────────────────────────
  let logMealApiKey : { var value : Text };

  // ── Domain mixins ──────────────────────────────────────────────────────────
  include AuthApi(users, pendingCodes, sessions, codeTtl, sessionTtl, maxAttempts);
  include ProfileApi(profiles, sessions);
  include MealApi(meals, mealsByUserDate, nextMealId, logMealApiKey, sessions);
  include ExerciseApi(exercises, exercisesByUserDate, nextExerciseId, profiles, sessions);
  include StepsApi(stepsByUserDate, profiles, sessions);
  include DashboardApi(meals, exercises, mealsByUserDate, exercisesByUserDate, stepsByUserDate, profiles, sessions);
  include AdminApi(accessControlState, logMealApiKey);

  // ── OQL: expose stored collections for natural-language querying ───────────
  include Expose({
    entities = [
      OQL.Entity.manual<MealTypes.Meal>("meal", func () = meals.values(), "Meal", "id")
        .payload("id", func (m : MealTypes.Meal) : Nat = m.id)
        .payload("userId", func (m : MealTypes.Meal) : Text = m.userId)
        .payload("date", func (m : MealTypes.Meal) : Text = m.date)
        .payload("mealType", func (m : MealTypes.Meal) : Text =
          switch (m.mealType) {
            case (#breakfast) "breakfast";
            case (#lunch) "lunch";
            case (#dinner) "dinner";
            case (#snack) "snack";
          })
        .payload("description", func (m : MealTypes.Meal) : Text = m.description)
        .payload("photo", func (m : MealTypes.Meal) : Text =
          switch (m.photo) { case (?_) "yes"; case null "no" })
        .payload("portionSize", func (m : MealTypes.Meal) : Text =
          switch (m.portionSize) { case (?p) p; case null "" })
        .payload("calories", func (m : MealTypes.Meal) : Nat = m.calories)
        .payload("protein", func (m : MealTypes.Meal) : Nat = m.macros.protein)
        .payload("carbs", func (m : MealTypes.Meal) : Nat = m.macros.carbs)
        .payload("fat", func (m : MealTypes.Meal) : Nat = m.macros.fat)
        .payload("loggedAt", func (m : MealTypes.Meal) : Nat = m.loggedAt)
        .ownedBy("userId")
        .controllerOrScoped()
        .build(),
      OQL.Entity.manual<ExerciseTypes.Exercise>("exercise", func () = exercises.values(), "Exercise", "id")
        .payload("id", func (e : ExerciseTypes.Exercise) : Nat = e.id)
        .payload("userId", func (e : ExerciseTypes.Exercise) : Text = e.userId)
        .payload("date", func (e : ExerciseTypes.Exercise) : Text = e.date)
        .payload("exerciseType", func (e : ExerciseTypes.Exercise) : Text = e.exerciseType)
        .payload("durationMin", func (e : ExerciseTypes.Exercise) : Nat = e.durationMin)
        .payload("intensity", func (e : ExerciseTypes.Exercise) : Text =
          switch (e.intensity) {
            case (?(#light)) "light";
            case (?(#moderate)) "moderate";
            case (?(#vigorous)) "vigorous";
            case null "";
          })
        .payload("distance", func (e : ExerciseTypes.Exercise) : Nat =
          switch (e.distance) { case (?d) d; case null 0 })
        .payload("photo", func (e : ExerciseTypes.Exercise) : Text =
          switch (e.photo) { case (?_) "yes"; case null "no" })
        .payload("caloriesBurned", func (e : ExerciseTypes.Exercise) : Nat = e.caloriesBurned)
        .payload("loggedAt", func (e : ExerciseTypes.Exercise) : Nat = e.loggedAt)
        .ownedBy("userId")
        .controllerOrScoped()
        .build(),
      // profiles: Map<UserId, Profile> — owner lives in the Map key, so iterate
      // .entries() and promote the key as the `userId` column.
      OQL.Entity.manual<(CommonTypes.UserId, ProfileTypes.Profile)>("profile", func () = profiles.entries(), "Profile", "userId")
        .payload("userId", func ((u, _)) : Text = u)
        .payload("age", func ((_, p)) : Nat = p.age)
        .payload("sex", func ((_, p)) : Text =
          switch (p.sex) { case (#male) "male"; case (#female) "female" })
        .payload("height", func ((_, p)) : Nat = p.height)
        .payload("weight", func ((_, p)) : Nat = p.weight)
        .payload("activityLevel", func ((_, p)) : Text =
          switch (p.activityLevel) {
            case (#sedentary) "sedentary";
            case (#lightlyActive) "lightlyActive";
            case (#moderatelyActive) "moderatelyActive";
            case (#veryActive) "veryActive";
            case (#extraActive) "extraActive";
          })
        .payload("goal", func ((_, p)) : Text =
          switch (p.goal) { case (#lose) "lose"; case (#maintain) "maintain"; case (#gain) "gain" })
        .payload("bmr", func ((_, p)) : Nat = p.bmr)
        .ownedBy("userId")
        .controllerOrScoped()
        .build(),
      // steps: Map<(UserId, Date), StepEntry> — owner lives in the value's
      // `userId` field, so iterate .values() and use it as the owner column.
      OQL.Entity.manual<StepTypes.StepEntry>("step", func () = stepsByUserDate.values(), "StepEntry", "date")
        .payload("userId", func (s : StepTypes.StepEntry) : Text = s.userId)
        .payload("date", func (s : StepTypes.StepEntry) : Text = s.date)
        .payload("steps", func (s : StepTypes.StepEntry) : Nat = s.steps)
        .payload("calories", func (s : StepTypes.StepEntry) : Nat = s.calories)
        .payload("updatedAt", func (s : StepTypes.StepEntry) : Nat = s.updatedAt)
        .ownedBy("userId")
        .controllerOrScoped()
        .build(),
    ];
  });
};
