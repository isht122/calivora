/**
 * TanStack Query hooks for the Calivora dashboard.
 *
 * Every hook reads the backend actor + user email + session token from the
 * auth context and delegates to the typed `api` adapter. Reads use `useQuery`,
 * writes use `useMutation` with cache invalidation so the dashboard refetches
 * after every add / update / delete.
 */
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type {
  Exercise,
  ExerciseInput,
  MacroBreakdown,
  Meal,
  MealInput,
  StepEntry,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* -------------------------------------------------------------------------- */
/*  Query keys                                                                */
/* -------------------------------------------------------------------------- */

/** Per-user, per-date key prefix keeps caches isolated across days. */
function dayKey(userId: string, date: string) {
  return ["day", userId, date] as const;
}

export const qk = {
  summary: (userId: string, date: string) =>
    [...dayKey(userId, date), "summary"] as const,
  meals: (userId: string, date: string) =>
    [...dayKey(userId, date), "meals"] as const,
  exercises: (userId: string, date: string) =>
    [...dayKey(userId, date), "exercises"] as const,
  steps: (userId: string, date: string) =>
    [...dayKey(userId, date), "steps"] as const,
};

/* -------------------------------------------------------------------------- */
/*  Reads                                                                     */
/* -------------------------------------------------------------------------- */

export function useDailySummary(date: string) {
  const { actor, email, sessionToken } = useAuth();
  return useQuery({
    queryKey: email ? qk.summary(email, date) : ["summary", "no-user"],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.getDailySummary(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken,
  });
}

export function useMeals(date: string) {
  const { actor, email, sessionToken } = useAuth();
  return useQuery<Meal[]>({
    queryKey: email ? qk.meals(email, date) : ["meals", "no-user"],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.listMeals(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken,
  });
}

export function useExercises(date: string) {
  const { actor, email, sessionToken } = useAuth();
  return useQuery<Exercise[]>({
    queryKey: email ? qk.exercises(email, date) : ["exercises", "no-user"],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.listExercises(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken,
  });
}

export function useSteps(date: string) {
  const { actor, email, sessionToken } = useAuth();
  return useQuery<StepEntry | null>({
    queryKey: email ? qk.steps(email, date) : ["steps", "no-user"],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.getSteps(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken,
  });
}

/* -------------------------------------------------------------------------- */
/*  Writes — all invalidate the day's cache so the dashboard refreshes.       */
/* -------------------------------------------------------------------------- */

function useInvalidateDay(date: string) {
  const qc = useQueryClient();
  const { email } = useAuth();
  return () => {
    if (!email) return;
    qc.invalidateQueries({ queryKey: dayKey(email, date) });
  };
}

export function useSetSteps(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (stepCount: number) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.setSteps(actor, sessionToken, email, date, stepCount);
    },
    onSuccess: invalidate,
  });
}

export function useAddMeal(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (args: {
      input: MealInput;
      calories: number;
      macros: MacroBreakdown;
    }) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.addMeal(
        actor,
        sessionToken,
        email,
        args.input,
        args.calories,
        args.macros,
      );
    },
    onSuccess: invalidate,
  });
}

export function useUpdateMeal(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (args: {
      mealId: number;
      input: MealInput;
      calories: number;
      macros: MacroBreakdown;
    }) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.updateMeal(
        actor,
        sessionToken,
        args.mealId,
        args.input,
        args.calories,
        args.macros,
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMeal(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (mealId: number) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.deleteMeal(actor, sessionToken, mealId);
    },
    onSuccess: invalidate,
  });
}

export function useEstimateMeal() {
  const { actor, email, sessionToken } = useAuth();
  return useMutation({
    mutationFn: async (input: MealInput) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.estimateMeal(actor, sessionToken, email, input);
    },
  });
}

export function useAddExercise(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (args: {
      input: ExerciseInput;
      caloriesBurned: number;
    }) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.addExercise(
        actor,
        sessionToken,
        email,
        args.input,
        args.caloriesBurned,
      );
    },
    onSuccess: invalidate,
  });
}

export function useUpdateExercise(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (args: {
      exerciseId: number;
      input: ExerciseInput;
      caloriesBurned: number;
    }) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.updateExercise(
        actor,
        sessionToken,
        args.exerciseId,
        args.input,
        args.caloriesBurned,
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteExercise(date: string) {
  const { actor, email, sessionToken } = useAuth();
  const invalidate = useInvalidateDay(date);
  return useMutation({
    mutationFn: async (exerciseId: number) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.deleteExercise(actor, sessionToken, exerciseId);
    },
    onSuccess: invalidate,
  });
}

export function useEstimateExercise() {
  const { actor, email, sessionToken } = useAuth();
  return useMutation({
    mutationFn: async (input: ExerciseInput) => {
      if (!actor || !email || !sessionToken) throw new Error("Not signed in");
      return api.estimateExercise(actor, sessionToken, email, input);
    },
  });
}
