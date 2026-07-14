import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarHeart,
  Flame,
  Loader2,
  Ruler,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Weight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  ACTIVITY_LEVEL_LABELS,
  type ActivityLevel,
  GOAL_LABELS,
  type Goal,
  type Profile,
  type Sex,
} from "@/types";

/* -------------------------------------------------------------------------- */
/*  Field config                                                               */
/* -------------------------------------------------------------------------- */

const ACTIVITY_ORDER: ActivityLevel[] = [
  "sedentary",
  "lightlyActive",
  "moderatelyActive",
  "veryActive",
  "extraActive",
];

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightlyActive: 1.375,
  moderatelyActive: 1.55,
  veryActive: 1.725,
  extraActive: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 350,
};

const GOAL_ICONS: Record<Goal, typeof TrendingDown> = {
  lose: TrendingDown,
  maintain: Target,
  gain: TrendingUp,
};

interface FormState {
  age: string;
  sex: Sex | "";
  height: string;
  weight: string;
  activityLevel: ActivityLevel | "";
  goal: Goal | "";
}

const INITIAL_FORM: FormState = {
  age: "",
  sex: "",
  height: "",
  weight: "",
  activityLevel: "",
  goal: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

/* -------------------------------------------------------------------------- */
/*  Validation                                                                 */
/* -------------------------------------------------------------------------- */

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  const age = Number(form.age);
  if (!form.age || Number.isNaN(age)) {
    errors.age = "Tell us your age (10–120).";
  } else if (age < 10 || age > 120) {
    errors.age = "Age should be between 10 and 120.";
  }

  if (!form.sex) errors.sex = "Pick one — it sharpens your estimate.";

  const height = Number(form.height);
  if (!form.height || Number.isNaN(height)) {
    errors.height = "Your height in cm (100–250).";
  } else if (height < 100 || height > 250) {
    errors.height = "Height should be between 100 and 250 cm.";
  }

  const weight = Number(form.weight);
  if (!form.weight || Number.isNaN(weight)) {
    errors.weight = "Your weight in kg (30–300).";
  } else if (weight < 30 || weight > 300) {
    errors.weight = "Weight should be between 30 and 300 kg.";
  }

  if (!form.activityLevel)
    errors.activityLevel = "How active are you day to day?";
  if (!form.goal) errors.goal = "What's your main goal right now?";

  return errors;
}

/* -------------------------------------------------------------------------- */
/*  BMR preview (Mifflin-St Jeor)                                             */
/* -------------------------------------------------------------------------- */

function estimateBmr(
  age: number,
  sex: Sex,
  weightKg: number,
  heightCm: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

function estimateDailyTarget(
  bmr: number,
  activity: ActivityLevel,
  goal: Goal,
): number {
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);
  return tdee + GOAL_ADJUSTMENT[goal];
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export function OnboardingPage() {
  const navigate = useNavigate();
  const { actor, email, sessionToken, markOnboarded } = useAuth();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormState, boolean>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => validate(form), [form]);

  const canPreview =
    !errors.age &&
    !errors.sex &&
    !errors.height &&
    !errors.weight &&
    !errors.activityLevel &&
    !errors.goal;

  const preview = useMemo(() => {
    if (!canPreview) return null;
    const bmr = estimateBmr(
      Number(form.age),
      form.sex as Sex,
      Number(form.weight),
      Number(form.height),
    );
    const target = estimateDailyTarget(
      bmr,
      form.activityLevel as ActivityLevel,
      form.goal as Goal,
    );
    return { bmr, target };
  }, [form, canPreview]);

  /* If we somehow land here without a session, bounce to login. */
  useEffect(() => {
    if (!email) void navigate({ to: "/login", replace: true });
  }, [email, navigate]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function showError(key: keyof FormState): string | undefined {
    return touched[key] ? errors[key] : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({
      age: true,
      sex: true,
      height: true,
      weight: true,
      activityLevel: true,
      goal: true,
    });
    setSubmitError(null);

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) return;

    if (!actor || !email || !sessionToken) {
      setSubmitError("We're still connecting — give it a second and retry.");
      return;
    }

    setSubmitting(true);
    try {
      const profile: Profile = {
        age: Number(form.age),
        sex: form.sex as Sex,
        weight: Number(form.weight),
        height: Number(form.height),
        activityLevel: form.activityLevel as ActivityLevel,
        goal: form.goal as Goal,
        bmr: 0, // backend calculates the real BMR
      };
      const saved = await api.saveProfile(actor, sessionToken, email, profile);
      markOnboarded();
      toast.success("Profile saved!", {
        description: `Your daily target is about ${Math.round(
          saved.bmr * ACTIVITY_FACTORS[saved.activityLevel] +
            GOAL_ADJUSTMENT[saved.goal],
        )} kcal. Let's go!`,
      });
      void navigate({ to: "/", replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong saving your profile. Try again?",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-subtle">
      {/* Header band */}
      <header className="bg-card border-b border-border px-4 pb-6 pt-10 text-center shadow-subtle">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-warm">
          <span className="font-display text-2xl font-bold text-primary-foreground">
            C
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Let's set up your profile
        </h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          This helps us calculate your daily calorie needs.
        </p>
      </header>

      {/* Form card */}
      <main className="flex flex-1 items-start justify-center px-4 py-6">
        <Card className="w-full max-w-md border-border bg-card shadow-warm">
          <CardHeader>
            <CardTitle className="text-xl">A few quick details</CardTitle>
            <CardDescription>
              Takes under a minute. You can tweak any of this later in Settings.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Age + Sex */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="age" className="flex items-center gap-1.5">
                    <CalendarHeart className="size-3.5 text-accent" />
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    placeholder="28"
                    min={10}
                    max={120}
                    value={form.age}
                    aria-invalid={!!showError("age")}
                    onChange={(e) => update("age", e.target.value)}
                    data-ocid="onboarding.age.input"
                  />
                  {showError("age") && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="onboarding.age.field_error"
                    >
                      {showError("age")}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <User className="size-3.5 text-accent" />
                    Sex
                  </Label>
                  <Select
                    value={form.sex}
                    onValueChange={(v) => update("sex", v as Sex)}
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-invalid={!!showError("sex")}
                      data-ocid="onboarding.sex.select"
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="female"
                        data-ocid="onboarding.sex.item.female"
                      >
                        Female
                      </SelectItem>
                      <SelectItem
                        value="male"
                        data-ocid="onboarding.sex.item.male"
                      >
                        Male
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {showError("sex") && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="onboarding.sex.field_error"
                    >
                      {showError("sex")}
                    </p>
                  )}
                </div>
              </div>

              {/* Height + Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="height" className="flex items-center gap-1.5">
                    <Ruler className="size-3.5 text-accent" />
                    Height (cm)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    placeholder="170"
                    min={100}
                    max={250}
                    value={form.height}
                    aria-invalid={!!showError("height")}
                    onChange={(e) => update("height", e.target.value)}
                    data-ocid="onboarding.height.input"
                  />
                  {showError("height") && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="onboarding.height.field_error"
                    >
                      {showError("height")}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="weight" className="flex items-center gap-1.5">
                    <Weight className="size-3.5 text-accent" />
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    inputMode="numeric"
                    placeholder="68"
                    min={30}
                    max={300}
                    value={form.weight}
                    aria-invalid={!!showError("weight")}
                    onChange={(e) => update("weight", e.target.value)}
                    data-ocid="onboarding.weight.input"
                  />
                  {showError("weight") && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="onboarding.weight.field_error"
                    >
                      {showError("weight")}
                    </p>
                  )}
                </div>
              </div>

              {/* Activity level */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Flame className="size-3.5 text-accent" />
                  Activity level
                </Label>
                <Select
                  value={form.activityLevel}
                  onValueChange={(v) =>
                    update("activityLevel", v as ActivityLevel)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!showError("activityLevel")}
                    data-ocid="onboarding.activity.select"
                  >
                    <SelectValue placeholder="How active are you?" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_ORDER.map((level, i) => (
                      <SelectItem
                        key={level}
                        value={level}
                        data-ocid={`onboarding.activity.item.${i + 1}`}
                      >
                        {ACTIVITY_LEVEL_LABELS[level]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showError("activityLevel") && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="onboarding.activity.field_error"
                  >
                    {showError("activityLevel")}
                  </p>
                )}
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Target className="size-3.5 text-accent" />
                  Your goal
                </Label>
                <Select
                  value={form.goal}
                  onValueChange={(v) => update("goal", v as Goal)}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!showError("goal")}
                    data-ocid="onboarding.goal.select"
                  >
                    <SelectValue placeholder="What are you aiming for?" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GOAL_LABELS) as Goal[]).map((g, i) => {
                      const Icon = GOAL_ICONS[g];
                      return (
                        <SelectItem
                          key={g}
                          value={g}
                          data-ocid={`onboarding.goal.item.${i + 1}`}
                        >
                          <Icon className="size-4 text-accent" />
                          {GOAL_LABELS[g]}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {showError("goal") && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="onboarding.goal.field_error"
                  >
                    {showError("goal")}
                  </p>
                )}
              </div>

              {/* BMR preview */}
              {preview ? (
                <div
                  className="rounded-xl border border-accent/30 bg-accent/10 p-4"
                  data-ocid="onboarding.bmr_preview.panel"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Flame className="size-4 text-accent" />
                    Your estimated daily target
                  </div>
                  <p className="mt-1 font-display text-3xl font-bold text-gradient-primary">
                    {preview.target.toLocaleString()} kcal
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Based on a BMR of ~{preview.bmr.toLocaleString()} kcal/day.
                    We'll fine-tune this once you save.
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl border border-border bg-muted/40 p-4"
                  data-ocid="onboarding.bmr_preview.placeholder"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Flame className="size-4 text-muted-foreground" />
                    Daily calorie target
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Fill in the details above and we'll preview your daily
                    calorie target here. Your exact BMR is calculated when you
                    save.
                  </p>
                </div>
              )}

              {/* Submit error */}
              {submitError && (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  data-ocid="onboarding.submit.error_state"
                  role="alert"
                >
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-primary text-primary-foreground shadow-warm hover:opacity-95"
                disabled={submitting}
                data-ocid="onboarding.submit_button"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Save & start tracking
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 px-4 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined" ? window.location.hostname : "",
            )}`}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
