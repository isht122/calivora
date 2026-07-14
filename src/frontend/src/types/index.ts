/**
 * Frontend-facing types for Calivora.
 *
 * These mirror the bindgen-generated backend types in `@/backend` but use
 * plain `number` for calorie / macro values and `string` for timestamps so
 * components can render them directly without sprinkling `Number(...)` /
 * `new Date(...)` calls everywhere. The `lib/api.ts` adapter layer converts
 * between the wire (bigint) and these friendly shapes.
 */

export type Sex = "female" | "male";

export type ActivityLevel =
  | "sedentary"
  | "lightlyActive"
  | "moderatelyActive"
  | "veryActive"
  | "extraActive";

export type Goal = "lose" | "maintain" | "gain";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Intensity = "light" | "moderate" | "vigorous";

export interface MacroBreakdown {
  protein: number;
  carbs: number;
  fat: number;
}

export interface Profile {
  age: number;
  sex: Sex;
  weight: number;
  height: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  bmr: number;
}

export interface Meal {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  portionSize?: string;
  mealType: MealType;
  calories: number;
  macros: MacroBreakdown;
  photoUrl?: string;
  /** True when the backend stored a photo for this meal. */
  hasPhoto?: boolean;
  loggedAt: number; // epoch ms
}

export interface MealInput {
  date: string;
  description: string;
  portionSize?: string;
  mealType: MealType;
  photo?: Uint8Array;
}

export interface Exercise {
  id: number;
  date: string;
  exerciseType: string;
  durationMin: number;
  distance?: number;
  intensity?: Intensity;
  caloriesBurned: number;
  photoUrl?: string;
  loggedAt: number;
}

export interface ExerciseInput {
  date: string;
  exerciseType: string;
  durationMin: number;
  distance?: number;
  intensity?: Intensity;
  photo?: Uint8Array;
}

export interface StepEntry {
  date: string;
  steps: number;
  calories: number;
  updatedAt: number;
}

export interface DailySummary {
  date: string;
  caloriesIn: number;
  caloriesOut: number;
  bmr: number;
  exerciseCalories: number;
  stepCalories: number;
  steps: number;
  netBalance: number;
  macroBreakdown: MacroBreakdown;
}

export interface NetBalancePoint {
  date: string;
  netBalance: number;
}

export interface User {
  email: string;
  createdAt: number;
  lastLoginAt: number;
}

/** Result of an estimate call (meal or exercise). */
export interface EstimateResult {
  calories: number;
  macros?: MacroBreakdown;
}

/** Friendly auth error codes surfaced to the UI. */
export type AuthErrorCode =
  | "invalidEmail"
  | "sendFailed"
  | "rateLimited"
  | "wrongCode"
  | "noPendingCode"
  | "expired"
  | "tooManyAttempts"
  | "unknown";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (desk job, little exercise)",
  lightlyActive: "Lightly active (1–3 days/week)",
  moderatelyActive: "Moderately active (3–5 days/week)",
  veryActive: "Very active (6–7 days/week)",
  extraActive: "Extra active (physical job + training)",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Lose weight",
  maintain: "Maintain weight",
  gain: "Gain weight",
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "Light",
  moderate: "Moderate",
  vigorous: "Vigorous",
};
