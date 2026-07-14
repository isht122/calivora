/**
 * Typed wrapper around the bindgen-generated backend actor.
 *
 * `useActor(createActor)` from `@caffeineai/core-infrastructure` returns a
 * `Backend` instance. This module exposes a single `api` object whose methods
 * accept friendly frontend types (numbers, ISO date strings) and return
 * friendly frontend types, hiding the bigint / variant plumbing from
 * components.
 *
 * The actor is created unauthenticated — Calivora uses email OTP, not
 * Internet Identity. The II provider is still mounted in main.tsx because
 * `useActor` reads from `useInternetIdentity` internally, but it is never
 * logged in.
 */
import type { Backend } from "@/backend";
import {
  type ActivityLevel,
  type Goal,
  type Intensity,
  type MealType,
  type RequestCodeResult,
  type Sex,
  VerifyCodeError,
  type VerifyCodeResult,
  type EstimateResult__1 as WireEstimateExerciseResult,
  type EstimateResult as WireEstimateResult,
  type Exercise as WireExercise,
  type ExerciseInput as WireExerciseInput,
  type MacroBreakdown as WireMacroBreakdown,
  type Meal as WireMeal,
  type MealInput as WireMealInput,
  type Profile as WireProfile,
  type StepEntry as WireStepEntry,
  type User as WireUser,
} from "@/backend";
import type {
  AuthError,
  AuthErrorCode,
  DailySummary,
  EstimateResult,
  Exercise,
  ExerciseInput,
  Intensity as IntensityT,
  MacroBreakdown,
  Meal,
  MealInput,
  MealType as MealTypeT,
  NetBalancePoint,
  Profile,
  Sex as SexT,
  StepEntry,
  User,
} from "@/types";

/* -------------------------------------------------------------------------- */
/*  Wire → friendly conversions                                               */
/* -------------------------------------------------------------------------- */

function toMacro(m: WireMacroBreakdown): MacroBreakdown {
  return {
    protein: Number(m.protein),
    carbs: Number(m.carbs),
    fat: Number(m.fat),
  };
}

function toProfile(p: WireProfile): Profile {
  return {
    age: Number(p.age),
    sex: p.sex as SexT,
    weight: Number(p.weight),
    height: Number(p.height),
    activityLevel: p.activityLevel as Profile["activityLevel"],
    goal: p.goal as Profile["goal"],
    bmr: Number(p.bmr),
  };
}

function toMeal(m: WireMeal): Meal {
  return {
    id: Number(m.id),
    date: m.date,
    description: m.description,
    portionSize: m.portionSize,
    mealType: m.mealType as MealTypeT,
    calories: Number(m.calories),
    macros: toMacro(m.macros),
    hasPhoto: !!m.photo,
    loggedAt: Number(m.loggedAt),
  };
}

function toExercise(e: WireExercise): Exercise {
  return {
    id: Number(e.id),
    date: e.date,
    exerciseType: e.exerciseType,
    durationMin: Number(e.durationMin),
    distance: e.distance != null ? Number(e.distance) : undefined,
    intensity: e.intensity as IntensityT | undefined,
    caloriesBurned: Number(e.caloriesBurned),
    loggedAt: Number(e.loggedAt),
  };
}

function toStepEntry(s: WireStepEntry): StepEntry {
  return {
    date: s.date,
    steps: Number(s.steps),
    calories: Number(s.calories),
    updatedAt: Number(s.updatedAt),
  };
}

function toUser(u: WireUser): User {
  return {
    email: u.email,
    createdAt: Number(u.createdAt),
    lastLoginAt: Number(u.lastLoginAt),
  };
}

/* -------------------------------------------------------------------------- */
/*  Friendly → wire conversions                                               */
/* -------------------------------------------------------------------------- */

function fromMacro(m: MacroBreakdown): WireMacroBreakdown {
  return {
    protein: BigInt(Math.round(m.protein)),
    carbs: BigInt(Math.round(m.carbs)),
    fat: BigInt(Math.round(m.fat)),
  };
}

function fromProfile(p: Profile): WireProfile {
  return {
    age: BigInt(Math.round(p.age)),
    sex: p.sex as Sex,
    weight: BigInt(Math.round(p.weight)),
    height: BigInt(Math.round(p.height)),
    activityLevel: p.activityLevel as ActivityLevel,
    goal: p.goal as Goal,
    bmr: BigInt(Math.round(p.bmr)),
  };
}

function fromMealInput(input: MealInput): WireMealInput {
  return {
    date: input.date,
    description: input.description,
    portionSize: input.portionSize,
    mealType: input.mealType as MealType,
    photo: input.photo,
  };
}

function fromExerciseInput(input: ExerciseInput): WireExerciseInput {
  return {
    date: input.date,
    exerciseType: input.exerciseType,
    durationMin: BigInt(Math.round(input.durationMin)),
    distance:
      input.distance != null ? BigInt(Math.round(input.distance)) : undefined,
    intensity: input.intensity as Intensity | undefined,
    photo: input.photo,
  };
}

/* -------------------------------------------------------------------------- */
/*  Result / variant helpers                                                  */
/* -------------------------------------------------------------------------- */

function describeRequestCodeError(err: RequestCodeResult): AuthError {
  if (err.__kind__ === "ok") {
    return { code: "unknown", message: "Unexpected success in error path" };
  }
  switch (err.err.__kind__) {
    case "invalidEmail":
      return {
        code: "invalidEmail",
        message: "That email looks off — double-check it?",
      };
    case "sendFailed":
      return {
        code: "sendFailed",
        message: "We couldn't send the code. Try again in a moment.",
      };
    case "rateLimited":
      return {
        code: "rateLimited",
        message: "Too many attempts — wait a bit before trying again.",
      };
    default:
      return {
        code: "unknown",
        message: "Something went wrong. Please retry.",
      };
  }
}

function describeVerifyCodeError(err: VerifyCodeResult): AuthError {
  if (err.__kind__ === "ok") {
    return { code: "unknown", message: "Unexpected success in error path" };
  }
  // VerifyCodeError is declared as a string enum in backend.d.ts, but the
  // runtime actor returns a tagged-variant object {__kind__: 'wrongCode'}.
  // Normalize to a kind string so we can switch on it like describeRequestCodeError.
  const raw = err.err as unknown;
  const kind =
    typeof raw === "object" && raw !== null && "__kind__" in raw
      ? String((raw as { __kind__: string }).__kind__)
      : String(raw);
  switch (kind) {
    case "wrongCode":
      return {
        code: "wrongCode",
        message: "That code is incorrect. Please try again.",
      };
    case "noPendingCode":
      return {
        code: "noPendingCode",
        message: "No code was requested. Please request a new code.",
      };
    case "expired":
      return {
        code: "expired",
        message: "That code has expired. Please request a new code.",
      };
    case "tooManyAttempts":
      return {
        code: "tooManyAttempts",
        message: "Too many attempts. Please request a new code.",
      };
    default:
      return { code: "unknown", message: "We couldn't verify the code." };
  }
}

function mapEstimateError(err: WireEstimateResult): AuthError {
  if (err.__kind__ === "ok")
    return { code: "unknown", message: "Unexpected success" };
  const e = err.err;
  switch (e.__kind__) {
    case "invalidInput":
      return {
        code: "unknown",
        message: e.invalidInput || "Check your input and try again.",
      };
    case "rateLimited":
      return {
        code: "rateLimited",
        message: "Slow down a touch — try again shortly.",
      };
    case "unauthorized":
      return { code: "unknown", message: "Please sign in to estimate." };
    case "notFound":
      return { code: "unknown", message: "We couldn't find a match for that." };
    default:
      return { code: "unknown", message: "Estimate failed. Please retry." };
  }
}

function mapEstimateExerciseError(err: WireEstimateExerciseResult): AuthError {
  if (err.__kind__ === "ok")
    return { code: "unknown", message: "Unexpected success" };
  return mapEstimateError({
    __kind__: "err",
    err: err.err,
  } as WireEstimateResult);
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const api = {
  /* ----- Auth ----------------------------------------------------------- */
  async requestCode(
    actor: Backend,
    email: string,
  ): Promise<{ ok: true } | { ok: false; error: AuthError }> {
    const res = await actor.requestCode(email);
    if (res.__kind__ === "ok") return { ok: true };
    return { ok: false, error: describeRequestCodeError(res) };
  },

  async verifyCode(
    actor: Backend,
    email: string,
    code: string,
  ): Promise<{ ok: true; token: string } | { ok: false; error: AuthError }> {
    const res = await actor.verifyCode(email, code);
    if (res.__kind__ === "ok") return { ok: true, token: res.ok };
    return { ok: false, error: describeVerifyCodeError(res) };
  },

  async validateSession(actor: Backend, token: string): Promise<string | null> {
    return actor.validateSession(token);
  },

  async logout(actor: Backend, token: string): Promise<void> {
    await actor.logout(token);
  },

  async getUser(actor: Backend, email: string): Promise<User | null> {
    const u = await actor.getUser(email);
    return u ? toUser(u) : null;
  },

  /* ----- Onboarding / profile ------------------------------------------- */
  async isOnboarded(
    actor: Backend,
    sessionToken: string,
    userId: string,
  ): Promise<boolean> {
    return actor.isOnboarded(sessionToken, userId);
  },

  async getProfile(
    actor: Backend,
    sessionToken: string,
    userId: string,
  ): Promise<Profile | null> {
    const p = await actor.getProfile(sessionToken, userId);
    return p ? toProfile(p) : null;
  },

  async saveProfile(
    actor: Backend,
    sessionToken: string,
    userId: string,
    profile: Profile,
  ): Promise<Profile> {
    const p = await actor.saveProfile(
      sessionToken,
      userId,
      fromProfile(profile),
    );
    return toProfile(p);
  },

  /* ----- Meals ---------------------------------------------------------- */
  async listMeals(
    actor: Backend,
    sessionToken: string,
    userId: string,
    date: string,
  ): Promise<Meal[]> {
    const meals = await actor.listMeals(sessionToken, userId, date);
    return meals.map(toMeal);
  },

  async getMeal(
    actor: Backend,
    sessionToken: string,
    mealId: number,
  ): Promise<Meal | null> {
    const m = await actor.getMeal(sessionToken, BigInt(mealId));
    return m ? toMeal(m) : null;
  },

  async addMeal(
    actor: Backend,
    sessionToken: string,
    userId: string,
    input: MealInput,
    calories: number,
    macros: MacroBreakdown,
  ): Promise<Meal> {
    const m = await actor.addMeal(
      sessionToken,
      userId,
      fromMealInput(input),
      BigInt(Math.round(calories)),
      fromMacro(macros),
    );
    return toMeal(m);
  },

  async updateMeal(
    actor: Backend,
    sessionToken: string,
    mealId: number,
    input: MealInput,
    calories: number,
    macros: MacroBreakdown,
  ): Promise<Meal | null> {
    const m = await actor.updateMeal(
      sessionToken,
      BigInt(mealId),
      fromMealInput(input),
      BigInt(Math.round(calories)),
      fromMacro(macros),
    );
    return m ? toMeal(m) : null;
  },

  async deleteMeal(
    actor: Backend,
    sessionToken: string,
    mealId: number,
  ): Promise<boolean> {
    return actor.deleteMeal(sessionToken, BigInt(mealId));
  },

  async estimateMeal(
    actor: Backend,
    sessionToken: string,
    userId: string,
    input: MealInput,
  ): Promise<EstimateResult | AuthError> {
    const res = await actor.estimateMeal(
      sessionToken,
      userId,
      fromMealInput(input),
    );
    if (res.__kind__ === "ok") {
      return {
        calories: Number(res.ok.calories),
        macros: toMacro(res.ok.macros),
      };
    }
    return mapEstimateError(res);
  },

  /* ----- Exercise ------------------------------------------------------- */
  async listExercises(
    actor: Backend,
    sessionToken: string,
    userId: string,
    date: string,
  ): Promise<Exercise[]> {
    const ex = await actor.listExercises(sessionToken, userId, date);
    return ex.map(toExercise);
  },

  async getExercise(
    actor: Backend,
    sessionToken: string,
    exerciseId: number,
  ): Promise<Exercise | null> {
    const e = await actor.getExercise(sessionToken, BigInt(exerciseId));
    return e ? toExercise(e) : null;
  },

  async addExercise(
    actor: Backend,
    sessionToken: string,
    userId: string,
    input: ExerciseInput,
    caloriesBurned: number,
  ): Promise<Exercise> {
    const e = await actor.addExercise(
      sessionToken,
      userId,
      fromExerciseInput(input),
      BigInt(Math.round(caloriesBurned)),
    );
    return toExercise(e);
  },

  async updateExercise(
    actor: Backend,
    sessionToken: string,
    exerciseId: number,
    input: ExerciseInput,
    caloriesBurned: number,
  ): Promise<Exercise | null> {
    const e = await actor.updateExercise(
      sessionToken,
      BigInt(exerciseId),
      fromExerciseInput(input),
      BigInt(Math.round(caloriesBurned)),
    );
    return e ? toExercise(e) : null;
  },

  async deleteExercise(
    actor: Backend,
    sessionToken: string,
    exerciseId: number,
  ): Promise<boolean> {
    return actor.deleteExercise(sessionToken, BigInt(exerciseId));
  },

  async estimateExercise(
    actor: Backend,
    sessionToken: string,
    userId: string,
    input: ExerciseInput,
  ): Promise<{ caloriesBurned: number } | AuthError> {
    const res = await actor.estimateExercise(
      sessionToken,
      userId,
      fromExerciseInput(input),
    );
    if (res.__kind__ === "ok")
      return { caloriesBurned: Number(res.ok.caloriesBurned) };
    return mapEstimateExerciseError(res);
  },

  /* ----- Steps ---------------------------------------------------------- */
  async getSteps(
    actor: Backend,
    sessionToken: string,
    userId: string,
    date: string,
  ): Promise<StepEntry | null> {
    const s = await actor.getSteps(sessionToken, userId, date);
    return s ? toStepEntry(s) : null;
  },

  async setSteps(
    actor: Backend,
    sessionToken: string,
    userId: string,
    date: string,
    stepCount: number,
  ): Promise<StepEntry> {
    const s = await actor.setSteps(
      sessionToken,
      userId,
      date,
      BigInt(Math.round(stepCount)),
    );
    return toStepEntry(s);
  },

  /* ----- Dashboard / history -------------------------------------------- */
  async getDailySummary(
    actor: Backend,
    sessionToken: string,
    userId: string,
    date: string,
  ): Promise<DailySummary> {
    const s = await actor.getDailySummary(sessionToken, userId, date);
    return {
      date: s.date,
      caloriesIn: Number(s.caloriesIn),
      caloriesOut: Number(s.caloriesOut),
      bmr: Number(s.bmr),
      exerciseCalories: Number(s.exerciseCalories),
      stepCalories: Number(s.stepCalories),
      steps: Number(s.steps),
      netBalance: Number(s.netBalance),
      macroBreakdown: toMacro(s.macroBreakdown),
    };
  },

  async getHistoryRange(
    actor: Backend,
    sessionToken: string,
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailySummary[]> {
    const rows = await actor.getHistoryRange(
      sessionToken,
      userId,
      startDate,
      endDate,
    );
    return rows.map((s) => ({
      date: s.date,
      caloriesIn: Number(s.caloriesIn),
      caloriesOut: Number(s.caloriesOut),
      bmr: Number(s.bmr),
      exerciseCalories: Number(s.exerciseCalories),
      stepCalories: Number(s.stepCalories),
      steps: Number(s.steps),
      netBalance: Number(s.netBalance),
      macroBreakdown: toMacro(s.macroBreakdown),
    }));
  },

  async getNetBalanceTrend(
    actor: Backend,
    sessionToken: string,
    userId: string,
    days: number,
  ): Promise<NetBalancePoint[]> {
    const rows = await actor.getNetBalanceTrend(
      sessionToken,
      userId,
      BigInt(Math.round(days)),
    );
    return rows.map((r) => ({
      date: r.date,
      netBalance: Number(r.netBalance),
    }));
  },
};

export type Api = typeof api;

/** Re-export the friendly AuthErrorCode for consumers. */
export type { AuthErrorCode };
