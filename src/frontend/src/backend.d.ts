import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Timestamp = bigint;
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error__1;
};
export interface Profile {
    age: bigint;
    bmr: bigint;
    sex: Sex;
    weight: bigint;
    height: bigint;
    activityLevel: ActivityLevel;
    goal: Goal;
}
export type RequestCodeResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: RequestCodeError;
};
export type EstimateResult = {
    __kind__: "ok";
    ok: {
        calories: Calories;
        macros: MacroBreakdown;
    };
} | {
    __kind__: "err";
    err: Error_;
};
export type Calories = bigint;
export type Code = string;
export type SessionToken = string;
export interface Cell {
    value: Value;
    name: string;
}
export interface StepEntry {
    userId: UserId;
    date: Date_;
    calories: Calories;
    updatedAt: Timestamp;
    steps: bigint;
}
export type VerifyCodeResult = {
    __kind__: "ok";
    ok: SessionToken;
} | {
    __kind__: "err";
    err: VerifyCodeError;
};
export type RequestCodeError = {
    __kind__: "invalidEmail";
    invalidEmail: null;
} | {
    __kind__: "sendFailed";
    sendFailed: string;
} | {
    __kind__: "rateLimited";
    rateLimited: null;
};
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type CodeTtl = bigint;
export type Email = string;
export interface NetBalancePoint {
    date: Date_;
    netBalance: bigint;
}
export interface Meal {
    id: bigint;
    userId: UserId;
    date: Date_;
    calories: Calories;
    description: string;
    portionSize?: string;
    macros: MacroBreakdown;
    photo?: Uint8Array;
    loggedAt: Timestamp;
    mealType: MealType;
}
export interface Exercise {
    id: bigint;
    userId: UserId;
    date: Date_;
    distance?: bigint;
    exerciseType: string;
    photo?: Uint8Array;
    caloriesBurned: Calories;
    durationMin: bigint;
    loggedAt: Timestamp;
    intensity?: Intensity;
}
export type Date_ = string;
export interface User {
    lastLoginAt: Timestamp;
    createdAt: Timestamp;
    email: Email;
}
export type Error__1 = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type Error_ = {
    __kind__: "internal";
    internal: string;
} | {
    __kind__: "invalidInput";
    invalidInput: string;
} | {
    __kind__: "notFound";
    notFound: null;
} | {
    __kind__: "rateLimited";
    rateLimited: null;
} | {
    __kind__: "unauthorized";
    unauthorized: null;
};
export interface DailySummary {
    bmr: Calories;
    stepCalories: Calories;
    date: Date_;
    exerciseCalories: Calories;
    macroBreakdown: MacroBreakdown;
    caloriesOut: Calories;
    steps: bigint;
    netBalance: bigint;
    caloriesIn: Calories;
}
export type UserId = string;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface ExerciseInput {
    date: Date_;
    distance?: bigint;
    exerciseType: string;
    photo?: Uint8Array;
    durationMin: bigint;
    intensity?: Intensity;
}
export interface MealInput {
    date: Date_;
    description: string;
    portionSize?: string;
    photo?: Uint8Array;
    mealType: MealType;
}
export type SessionTtl = bigint;
export interface MacroBreakdown {
    fat: bigint;
    carbs: bigint;
    protein: bigint;
}
export type EstimateResult__1 = {
    __kind__: "ok";
    ok: {
        caloriesBurned: Calories;
    };
} | {
    __kind__: "err";
    err: Error_;
};
export enum ActivityLevel {
    lightlyActive = "lightlyActive",
    extraActive = "extraActive",
    veryActive = "veryActive",
    moderatelyActive = "moderatelyActive",
    sedentary = "sedentary"
}
export enum Goal {
    gain = "gain",
    lose = "lose",
    maintain = "maintain"
}
export enum Intensity {
    light = "light",
    vigorous = "vigorous",
    moderate = "moderate"
}
export enum MealType {
    breakfast = "breakfast",
    lunch = "lunch",
    snack = "snack",
    dinner = "dinner"
}
export enum Sex {
    female = "female",
    male = "male"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum VerifyCodeError {
    wrongCode = "wrongCode",
    noPendingCode = "noPendingCode",
    expired = "expired",
    tooManyAttempts = "tooManyAttempts"
}
export interface backendInterface {
    addExercise(sessionToken: SessionToken, userId: UserId, input: ExerciseInput, caloriesBurned: Calories): Promise<Exercise>;
    addMeal(sessionToken: SessionToken, userId: UserId, input: MealInput, calories: Calories, macros: MacroBreakdown): Promise<Meal>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteExercise(sessionToken: SessionToken, exerciseId: bigint): Promise<boolean>;
    deleteMeal(sessionToken: SessionToken, mealId: bigint): Promise<boolean>;
    estimateExercise(sessionToken: SessionToken, userId: UserId, input: ExerciseInput): Promise<EstimateResult__1>;
    estimateMeal(sessionToken: SessionToken, userId: UserId, input: MealInput): Promise<EstimateResult>;
    execute(qJson: string): Promise<Result>;
    getCallerUserRole(): Promise<UserRole>;
    getDailySummary(sessionToken: SessionToken, userId: UserId, date: Date_): Promise<DailySummary>;
    getExercise(sessionToken: SessionToken, exerciseId: bigint): Promise<Exercise | null>;
    getHistoryRange(sessionToken: SessionToken, userId: UserId, startDate: Date_, endDate: Date_): Promise<Array<DailySummary>>;
    getMeal(sessionToken: SessionToken, mealId: bigint): Promise<Meal | null>;
    getNetBalanceTrend(sessionToken: SessionToken, userId: UserId, days: bigint): Promise<Array<NetBalancePoint>>;
    getProfile(sessionToken: SessionToken, userId: UserId): Promise<Profile | null>;
    getSteps(sessionToken: SessionToken, userId: UserId, date: Date_): Promise<StepEntry | null>;
    getTodaySteps(sessionToken: SessionToken, userId: UserId): Promise<StepEntry | null>;
    getUser(email: Email): Promise<User | null>;
    isCallerAdmin(): Promise<boolean>;
    isOnboarded(sessionToken: SessionToken, userId: UserId): Promise<boolean>;
    listExercises(sessionToken: SessionToken, userId: UserId, date: Date_): Promise<Array<Exercise>>;
    listMeals(sessionToken: SessionToken, userId: UserId, date: Date_): Promise<Array<Meal>>;
    logout(token: SessionToken): Promise<void>;
    requestCode(email: Email): Promise<RequestCodeResult>;
    saveProfile(sessionToken: SessionToken, userId: UserId, profile: Profile): Promise<Profile>;
    schema(): Promise<string>;
    setLogMealApiKey(key: string): Promise<void>;
    setSteps(sessionToken: SessionToken, userId: UserId, date: Date_, stepCount: bigint): Promise<StepEntry>;
    updateExercise(sessionToken: SessionToken, exerciseId: bigint, input: ExerciseInput, caloriesBurned: Calories): Promise<Exercise | null>;
    updateMeal(sessionToken: SessionToken, mealId: bigint, input: MealInput, calories: Calories, macros: MacroBreakdown): Promise<Meal | null>;
    validateSession(token: SessionToken): Promise<Email | null>;
    verifyCode(email: Email, code: Code): Promise<VerifyCodeResult>;
}
