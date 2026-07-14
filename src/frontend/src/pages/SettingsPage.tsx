import { createActor } from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ACTIVITY_LEVEL_LABELS,
  type ActivityLevel,
  GOAL_LABELS,
  type Goal,
  type Profile,
  type Sex,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Flame,
  LogOut,
  Monitor,
  Moon,
  Save,
  Sun,
  Target,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*  Field option lists                                                        */
/* -------------------------------------------------------------------------- */

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const ACTIVITY_OPTIONS = (
  Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]
).map((value) => ({ value, label: ACTIVITY_LEVEL_LABELS[value] }));

const GOAL_OPTIONS = (Object.keys(GOAL_LABELS) as Goal[]).map((value) => ({
  value,
  label: GOAL_LABELS[value],
}));

/* -------------------------------------------------------------------------- */
/*  Theme picker options                                                       */
/* -------------------------------------------------------------------------- */

type ThemeOption = "light" | "dark" | "system";

const THEME_OPTIONS: {
  value: ThemeOption;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright and fresh for daytime tracking.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes after sundown.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follows your device's appearance setting.",
    icon: Monitor,
  },
];

/* -------------------------------------------------------------------------- */
/*  SettingsPage                                                              */
/* -------------------------------------------------------------------------- */

export function SettingsPage() {
  const { actor, isFetching } = useActor(createActor);
  const { email, sessionToken, logout } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  /* ----- Fetch profile -------------------------------------------------- */
  const profileQuery = useQuery<Profile | null>({
    queryKey: ["profile", email],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) return null;
      return api.getProfile(actor, sessionToken, email);
    },
    enabled: !!actor && !isFetching && !!email && !!sessionToken,
  });

  /* ----- Local form state, synced once profile loads -------------------- */
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderatelyActive");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [bmr, setBmr] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !profileQuery.data) return;
    const p = profileQuery.data;
    setAge(String(p.age));
    setSex(p.sex);
    setHeight(String(p.height));
    setWeight(String(p.weight));
    setActivityLevel(p.activityLevel);
    setGoal(p.goal);
    setBmr(p.bmr);
    setHydrated(true);
  }, [profileQuery.data, hydrated]);

  /* ----- Save mutation -------------------------------------------------- */
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!actor || !email || !sessionToken) throw new Error("Not connected");
      const profile: Profile = {
        age: Number(age),
        sex,
        height: Number(height),
        weight: Number(weight),
        activityLevel,
        goal,
        bmr: bmr ?? 0,
      };
      return api.saveProfile(actor, sessionToken, email, profile);
    },
    onSuccess: (saved) => {
      setBmr(saved.bmr);
      queryClient.invalidateQueries({ queryKey: ["profile", email] });
      queryClient.invalidateQueries({ queryKey: ["dailySummary"] });
      toast.success("Profile saved", {
        description: `Your daily burn is ${Math.round(
          saved.bmr,
        )} kcal — nice baseline!`,
      });
    },
    onError: () => {
      toast.error("Couldn't save", {
        description: "Give it another go in a moment.",
      });
    },
  });

  /* ----- Validation ----------------------------------------------------- */
  const validation = useMemo(() => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    const errors: Record<string, string> = {};
    if (!age || Number.isNaN(a) || a < 13 || a > 100)
      errors.age = "Enter an age between 13 and 100.";
    if (!height || Number.isNaN(h) || h < 100 || h > 250)
      errors.height = "Enter a height between 100 and 250 cm.";
    if (!weight || Number.isNaN(w) || w < 30 || w > 300)
      errors.weight = "Enter a weight between 30 and 300 kg.";
    return { errors, isValid: Object.keys(errors).length === 0 };
  }, [age, height, weight]);

  const handleSave = () => {
    if (!validation.isValid) {
      toast.error("Check your details", {
        description: Object.values(validation.errors)[0],
      });
      return;
    }
    saveMutation.mutate();
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out", {
      description: "Come back soon — your streak will be waiting.",
    });
  };

  /* ----- Render --------------------------------------------------------- */
  return (
    <div className="space-y-5 pb-32">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Your Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your details anytime — we'll recalculate your burn on save.
        </p>
      </header>

      {/* BMR highlight card */}
      <Card className="border-border bg-gradient-warm text-accent-foreground shadow-warm">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Flame className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium opacity-90">Daily burn (BMR)</p>
            {bmr == null ? (
              <Skeleton className="mt-1 h-7 w-28" />
            ) : (
              <p className="font-display text-2xl font-bold">
                {Math.round(bmr)}{" "}
                <span className="text-base font-medium opacity-80">kcal</span>
              </p>
            )}
            <p className="text-xs opacity-80">
              Your body's baseline — even before you move.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile form */}
      <Card className="border-border bg-card shadow-warm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCircle className="size-5 text-primary" />
            Edit profile
          </CardTitle>
          <CardDescription>
            Same details as onboarding — tweak them whenever life changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hydrated ? (
            <ProfileFormSkeleton />
          ) : (
            <>
              {/* Age + Sex */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="age" data-ocid="profile.age.label">
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="30"
                    aria-invalid={!!validation.errors.age}
                    data-ocid="profile.age.input"
                  />
                  {validation.errors.age && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="profile.age.field_error"
                    >
                      {validation.errors.age}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label data-ocid="profile.sex.label">Sex</Label>
                  <Select value={sex} onValueChange={(v) => setSex(v as Sex)}>
                    <SelectTrigger
                      className="w-full"
                      data-ocid="profile.sex.select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEX_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Height + Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="height" data-ocid="profile.height.label">
                    Height (cm)
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    inputMode="numeric"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="170"
                    aria-invalid={!!validation.errors.height}
                    data-ocid="profile.height.input"
                  />
                  {validation.errors.height && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="profile.height.field_error"
                    >
                      {validation.errors.height}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="weight" data-ocid="profile.weight.label">
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    type="number"
                    inputMode="numeric"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    aria-invalid={!!validation.errors.weight}
                    data-ocid="profile.weight.input"
                  />
                  {validation.errors.weight && (
                    <p
                      className="text-xs text-destructive"
                      data-ocid="profile.weight.field_error"
                    >
                      {validation.errors.weight}
                    </p>
                  )}
                </div>
              </div>

              {/* Activity level */}
              <div className="space-y-1.5">
                <Label
                  className="flex items-center gap-1.5"
                  data-ocid="profile.activity.label"
                >
                  <Activity className="size-3.5" /> Activity level
                </Label>
                <Select
                  value={activityLevel}
                  onValueChange={(v) => setActivityLevel(v as ActivityLevel)}
                >
                  <SelectTrigger
                    className="w-full"
                    data-ocid="profile.activity.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <Label
                  className="flex items-center gap-1.5"
                  data-ocid="profile.goal.label"
                >
                  <Target className="size-3.5" /> Goal
                </Label>
                <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                  <SelectTrigger
                    className="w-full"
                    data-ocid="profile.goal.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full bg-gradient-primary font-semibold text-primary-foreground shadow-warm transition-smooth hover:opacity-95"
                data-ocid="profile.save_button"
              >
                <Save className="size-4" />
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Appearance — theme picker */}
      <Card className="border-border bg-card shadow-warm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sun className="size-5 text-highlight" />
            Appearance
          </CardTitle>
          <CardDescription>
            Pick how Calivora looks. Your choice sticks across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePicker
            value={(theme as ThemeOption) ?? "light"}
            onChange={(opt) => setTheme(opt)}
          />
        </CardContent>
      </Card>

      {/* Account / logout */}
      <Card className="border-border bg-card shadow-warm">
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>
            {email ?? "—"} · signed in with email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full border-destructive/40 text-destructive transition-smooth hover:bg-destructive/10"
                data-ocid="logout.open_modal_button"
              >
                <LogOut className="size-4" />
                Log out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-ocid="logout.dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Log out of Calivora?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to log out? You'll need to sign back in
                  with your email to continue tracking.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-ocid="logout.cancel_button">
                  Stay signed in
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-ocid="logout.confirm_button"
                >
                  Log out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ThemePicker — 3-option Light/Dark/System selector with keyboard nav        */
/* -------------------------------------------------------------------------- */

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeOption;
  onChange: (opt: ThemeOption) => void;
}) {
  // Native radio inputs (visually hidden) wrapped in styled <label>s.
  // Using real radios gives us the radiogroup semantics, arrow-key roving,
  // and focus handling for free — satisfying the a11y lint rule while
  // keeping the custom card-style appearance.
  return (
    <fieldset
      aria-label="Color theme"
      className="grid grid-cols-3 gap-2.5 border-0 p-0 m-0"
    >
      {THEME_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = opt.value === value;
        const inputId = `appearance-${opt.value}`;
        return (
          <div key={opt.value} className="contents">
            <input
              type="radio"
              name="appearance-theme"
              id={inputId}
              checked={isActive}
              onChange={() => onChange(opt.value)}
              data-ocid={`appearance.${opt.value}.radio`}
              className="sr-only"
            />
            <label
              htmlFor={inputId}
              data-ocid={`appearance.${opt.value}.button`}
              className={`group flex flex-col cursor-pointer items-center gap-2 rounded-xl border p-3 text-center transition-smooth focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background ${
                isActive
                  ? "border-primary bg-primary/10 shadow-warm"
                  : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-full transition-smooth ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:text-primary"
                }`}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {opt.label}
              </span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeleton for the form while profile loads                                 */
/* -------------------------------------------------------------------------- */

function ProfileFormSkeleton() {
  return (
    <div className="space-y-4" data-ocid="profile.loading_state">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
