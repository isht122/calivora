import { Button } from "@/components/ui/button";
/**
 * Calivora — Home dashboard.
 *
 * Single-file dashboard with inline sub-components for: daily totals,
 * macro chart, steps input, add/edit meal dialog, add/edit exercise dialog,
 * today's meals list, and today's exercise list.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useAddExercise,
  useAddMeal,
  useDailySummary,
  useDeleteExercise,
  useDeleteMeal,
  useEstimateExercise,
  useEstimateMeal,
  useExercises,
  useMeals,
  useSetSteps,
  useSteps,
  useUpdateExercise,
  useUpdateMeal,
} from "@/hooks/useQueries";
import {
  type Exercise,
  INTENSITY_LABELS,
  type Intensity,
  MEAL_TYPE_LABELS,
  type Meal,
  type MealType,
} from "@/types";
import { useCamera } from "@caffeineai/camera";
import {
  Camera,
  CameraOff,
  Dumbbell,
  Flame,
  Footprints,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const TODAY = new Date().toISOString().slice(0, 10);

const MEAL_TYPE_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/* Macro → Citrus Pulse chart tokens (defined in index.css :root and .dark).
 * protein = chart-1 (berry pink), carbs = chart-2 (electric violet),
 * fat = chart-3 (sunshine yellow). Using var() so charts re-color per theme. */
const MACRO_COLORS: Record<"protein" | "carbs" | "fat", string> = {
  protein: "oklch(var(--chart-1))",
  carbs: "oklch(var(--chart-2))",
  fat: "oklch(var(--chart-3))",
};

function encouragement(net: number): string {
  if (net <= 0) return "You're burning bright today! Keep it up!";
  if (net < 300) return "Great balance — you're right on track!";
  return "Great start today! Every bite fuels your goals.";
}

function fileToBytes(file: File): Promise<Uint8Array> {
  return file.arrayBuffer().then((buf) => new Uint8Array(buf));
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export function HomePage() {
  const summary = useDailySummary(TODAY);

  return (
    <div className="space-y-5 pb-6">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Today
        </h1>
        <p className="text-sm text-muted-foreground">
          {summary.data
            ? encouragement(summary.data.netBalance)
            : "Your energy balance at a glance."}
        </p>
      </header>

      <DashboardTotals />
      <MacroChart />
      <StepsInput />
      <AddMealSection />
      <AddExerciseSection />
      <TodayMeals />
      <TodayExercises />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  1. Dashboard totals                                                        */
/* -------------------------------------------------------------------------- */

function DashboardTotals() {
  const { data, isLoading } = useDailySummary(TODAY);
  const [includeBmr, setIncludeBmr] = useState(true);

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="border-border bg-card shadow-warm">
            <CardContent className="h-28 animate-pulse rounded-2xl bg-muted/40" />
          </Card>
        ))}
      </div>
    );
  }

  const caloriesOut = includeBmr
    ? data.caloriesOut
    : data.exerciseCalories + data.stepCalories;
  const net = data.caloriesIn - caloriesOut;
  const netTone = net <= 0 ? "text-success" : "text-primary";

  return (
    <section data-ocid="dashboard.totals" className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Calories In"
          value={data.caloriesIn}
          icon={<Utensils className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Calories Out"
          value={caloriesOut}
          icon={<Flame className="h-4 w-4" />}
          tone="accent"
        />
      </div>

      <Card className="border-border bg-gradient-warm text-accent-foreground shadow-warm-lg">
        <CardContent className="flex items-center justify-between py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              Net Balance
            </p>
            <p className="font-display text-4xl font-bold">
              {net > 0 ? "+" : ""}
              {net}
              <span className="ml-1 text-base font-normal opacity-70">
                kcal
              </span>
            </p>
            <p className={`text-xs font-medium ${netTone}`}>
              {net <= 0 ? "Surplus burn — nice!" : "Fueling up"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Label
              htmlFor="bmr-toggle"
              className="text-xs font-medium opacity-80"
            >
              Include BMR
            </Label>
            <Switch
              id="bmr-toggle"
              data-ocid="dashboard.bmr_toggle"
              checked={includeBmr}
              onCheckedChange={setIncludeBmr}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "primary" | "accent";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : "bg-accent/15 text-accent-foreground";
  return (
    <Card className="border-border bg-card shadow-warm">
      <CardContent className="py-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${toneClass}`}
          >
            {icon}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="font-display text-3xl font-bold text-foreground">
          {value}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            kcal
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  2. Macro chart                                                             */
/* -------------------------------------------------------------------------- */

function MacroChart() {
  const { data } = useDailySummary(TODAY);

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Protein", value: data.macroBreakdown.protein, key: "protein" },
      { name: "Carbs", value: data.macroBreakdown.carbs, key: "carbs" },
      { name: "Fat", value: data.macroBreakdown.fat, key: "fat" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const barData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Protein", grams: data.macroBreakdown.protein },
      { name: "Carbs", grams: data.macroBreakdown.carbs },
      { name: "Fat", grams: data.macroBreakdown.fat },
    ];
  }, [data]);

  if (!data) return null;
  const total = pieData.reduce((sum, d) => sum + d.value, 0);
  const hasMacros = total > 0;

  return (
    <section data-ocid="dashboard.macro_chart" className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Macro Breakdown
      </h2>
      <Card className="border-border bg-card shadow-warm">
        <CardContent className="py-4">
          {!hasMacros ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Log a meal to see your macros light up here.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={
                            MACRO_COLORS[entry.key as keyof typeof MACRO_COLORS]
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((d) => {
                  const pct =
                    total > 0 ? Math.round((d.value / total) * 100) : 0;
                  return (
                    <div key={d.key} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          background:
                            MACRO_COLORS[d.key as keyof typeof MACRO_COLORS],
                        }}
                      />
                      <span className="flex-1 text-sm font-medium text-foreground">
                        {d.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {d.value}g · {pct}%
                      </span>
                    </div>
                  );
                })}
                <Separator className="my-2" />
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        stroke="oklch(var(--muted-foreground))"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="oklch(var(--muted-foreground))"
                      />
                      <Bar dataKey="grams" radius={[6, 6, 0, 0]}>
                        {barData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={
                              MACRO_COLORS[
                                entry.name.toLowerCase() as keyof typeof MACRO_COLORS
                              ]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  3. Steps input                                                             */
/* -------------------------------------------------------------------------- */

function StepsInput() {
  const { data } = useSteps(TODAY);
  const setSteps = useSetSteps(TODAY);
  const [value, setValue] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const current = data?.steps ?? 0;
  const calories = data?.calories ?? 0;
  const display = value === "" ? current : Number(value) || 0;

  const handleSave = () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Enter a valid step count");
      return;
    }
    setSteps.mutate(n, {
      onSuccess: () => {
        toast.success("Steps saved — keep moving!");
        setSaved(true);
        setValue("");
      },
      onError: () => toast.error("Couldn't save steps"),
    });
  };

  return (
    <section data-ocid="dashboard.steps" className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Steps Today
      </h2>
      <Card className="border-border bg-card shadow-warm">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
              <Footprints className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <Label htmlFor="steps-input" className="sr-only">
                Steps today
              </Label>
              <Input
                id="steps-input"
                data-ocid="dashboard.steps_input"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder={current > 0 ? String(current) : "Enter steps"}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSaved(false);
                }}
                className="font-display text-lg font-semibold"
              />
            </div>
            <Button
              data-ocid="dashboard.save_steps_button"
              onClick={handleSave}
              disabled={value === "" || setSteps.isPending}
            >
              {setSteps.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {saved ? "Saved!" : "Current"}:{" "}
              <span className="font-semibold text-foreground">
                {display.toLocaleString()} steps
              </span>
            </span>
            <span className="text-muted-foreground">
              ≈{" "}
              <span className="font-semibold text-accent-foreground">
                {calories} kcal
              </span>{" "}
              burned
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  4. Add / edit meal                                                         */
/* -------------------------------------------------------------------------- */

interface MealFormState {
  description: string;
  mealType: MealType;
  portionSize: string;
  photo?: File;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const EMPTY_MEAL: MealFormState = {
  description: "",
  mealType: "breakfast",
  portionSize: "",
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

function AddMealSection() {
  return (
    <section data-ocid="dashboard.add_meal" className="space-y-2">
      <MealDialog
        trigger={
          <Button
            data-ocid="dashboard.add_meal_button"
            className="w-full"
            size="lg"
          >
            <Plus className="mr-1 h-4 w-4" /> Log a Meal
          </Button>
        }
      />
    </section>
  );
}

type PhotoMode = "upload" | "camera";

function MealPhotoInput({
  photo,
  onPhotoChange,
  open,
}: {
  photo: File | undefined;
  onPhotoChange: (file: File | undefined) => void;
  open: boolean;
}) {
  const [mode, setMode] = useState<PhotoMode>("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);

  const camera = useCamera({ facingMode: "environment" });

  // Keep preview in sync with the current photo File.
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Release the device stream when the dialog closes or a photo is captured.
  useEffect(() => {
    if (!open && camera.isActive) {
      void camera.stopCamera();
    }
  }, [open, camera.isActive, camera.stopCamera]);

  // Stop the camera once a photo has been captured.
  useEffect(() => {
    if (photo && camera.isActive) {
      void camera.stopCamera();
    }
  }, [photo, camera.isActive, camera.stopCamera]);

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    onPhotoChange(f);
  };

  const handleCapture = async () => {
    const file = await camera.capturePhoto();
    if (file) {
      onPhotoChange(file);
    }
  };

  const handleRemove = () => {
    onPhotoChange(undefined);
    if (fileInputEl) fileInputEl.value = "";
  };

  const showCameraOption = camera.isSupported !== false;
  const cameraReady = camera.isActive && !camera.isLoading;

  return (
    <div className="space-y-2">
      <Label>Photo (optional)</Label>

      {previewUrl ? (
        <div
          data-ocid="dashboard.meal_photo_preview"
          className="relative overflow-hidden rounded-xl border border-border bg-muted/40"
        >
          <img
            src={previewUrl}
            alt="Meal preview"
            className="h-44 w-full object-cover"
          />
          <Button
            data-ocid="dashboard.meal_photo_remove_button"
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Remove photo"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          {showCameraOption && (
            <div className="inline-flex w-full rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                data-ocid="dashboard.meal_photo_mode_upload"
                onClick={() => {
                  setMode("upload");
                  if (camera.isActive) void camera.stopCamera();
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "upload"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-3.5 w-3.5" /> Upload
              </button>
              <button
                type="button"
                data-ocid="dashboard.meal_take_photo_button"
                onClick={() => setMode("camera")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "camera"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera className="h-3.5 w-3.5" /> Take Photo
              </button>
            </div>
          )}

          {mode === "upload" ? (
            <Input
              ref={setFileInputEl}
              data-ocid="dashboard.meal_photo_input"
              type="file"
              accept="image/*"
              onChange={handleUploadChange}
            />
          ) : (
            <div className="space-y-2">
              <div
                className="relative overflow-hidden rounded-xl border border-border bg-muted/40"
                style={{ aspectRatio: "4 / 3" }}
              >
                <video
                  ref={camera.videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${
                    cameraReady ? "block" : "hidden"
                  }`}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                    {camera.isLoading ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span>Starting camera…</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        <span>Camera preview will appear here</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <canvas ref={camera.canvasRef} className="hidden" />

              {camera.error ? (
                <p
                  data-ocid="dashboard.meal_camera_error"
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <CameraOff className="h-3.5 w-3.5" />
                  {camera.error.message}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  {!camera.isActive ? (
                    <Button
                      type="button"
                      data-ocid="dashboard.meal_take_photo_button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => void camera.startCamera()}
                      disabled={camera.isLoading}
                    >
                      <Camera className="mr-1 h-4 w-4" />
                      {camera.isLoading ? "Starting…" : "Start Camera"}
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        data-ocid="dashboard.meal_capture_button"
                        className="flex-1"
                        onClick={handleCapture}
                        disabled={!cameraReady}
                      >
                        <Camera className="mr-1 h-4 w-4" />
                        {camera.isLoading ? "Capturing…" : "Capture"}
                      </Button>
                      <Button
                        type="button"
                        data-ocid="dashboard.meal_camera_switch_button"
                        variant="secondary"
                        size="icon"
                        aria-label="Switch camera"
                        className="sm:hidden"
                        onClick={() => void camera.switchCamera()}
                        disabled={camera.isLoading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        data-ocid="dashboard.meal_camera_stop_button"
                        variant="ghost"
                        size="icon"
                        aria-label="Stop camera"
                        onClick={() => void camera.stopCamera()}
                        disabled={camera.isLoading}
                      >
                        <CameraOff className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MealDialog({
  trigger,
  meal,
}: {
  trigger: React.ReactNode;
  meal?: Meal;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MealFormState>(EMPTY_MEAL);
  const [estimated, setEstimated] = useState(false);
  const estimate = useEstimateMeal();
  const addMeal = useAddMeal(TODAY);
  const updateMeal = useUpdateMeal(TODAY);

  const isEdit = !!meal;

  const openDialog = () => {
    if (meal) {
      setForm({
        description: meal.description,
        mealType: meal.mealType,
        portionSize: meal.portionSize ?? "",
        calories: meal.calories,
        protein: meal.macros.protein,
        carbs: meal.macros.carbs,
        fat: meal.macros.fat,
      });
      setEstimated(true);
    } else {
      setForm(EMPTY_MEAL);
      setEstimated(false);
    }
    setOpen(true);
  };

  const handlePhotoChange = (file: File | undefined) => {
    setForm((s) => ({ ...s, photo: file }));
    setEstimated(false);
  };

  const handleEstimate = async () => {
    if (!form.description.trim() && !form.photo) {
      toast.error("Add a description or photo first");
      return;
    }
    const input = await buildMealInput(form);
    estimate.mutate(input, {
      onSuccess: (res) => {
        if ("code" in res) {
          toast.error(res.message || "Estimate failed — try again");
          return;
        }
        setForm((f) => ({
          ...f,
          calories: res.calories,
          protein: res.macros?.protein ?? f.protein,
          carbs: res.macros?.carbs ?? f.carbs,
          fat: res.macros?.fat ?? f.fat,
        }));
        setEstimated(true);
        toast.success("Estimated! Tweak if needed.");
      },
      onError: () => toast.error("Estimate failed — try again"),
    });
  };

  const handleSave = async () => {
    if (!form.description.trim() && !form.photo) {
      toast.error("Add a description or photo first");
      return;
    }
    if (form.calories <= 0) {
      toast.error("Calories must be greater than 0");
      return;
    }
    const input = await buildMealInput(form);
    const macros = {
      protein: form.protein,
      carbs: form.carbs,
      fat: form.fat,
    };
    const mutation = isEdit
      ? updateMeal.mutateAsync({
          mealId: meal!.id,
          input,
          calories: form.calories,
          macros,
        })
      : addMeal.mutateAsync({ input, calories: form.calories, macros });

    mutation
      .then(() => {
        toast.success(isEdit ? "Meal updated!" : "Meal logged — nice fuel!");
        setOpen(false);
      })
      .catch(() => toast.error("Couldn't save meal"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={openDialog}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        data-ocid="dashboard.meal_dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Meal" : "Log a Meal"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below."
              : "Add a photo or describe what you ate. We'll estimate the rest."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <MealPhotoInput
            photo={form.photo}
            onPhotoChange={handlePhotoChange}
            open={open}
          />

          <div className="space-y-1.5">
            <Label htmlFor="meal-desc">Description</Label>
            <Input
              id="meal-desc"
              data-ocid="dashboard.meal_desc_input"
              placeholder="e.g. Grilled chicken salad"
              value={form.description}
              onChange={(e) => {
                setForm((s) => ({ ...s, description: e.target.value }));
                setEstimated(false);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Meal type</Label>
              <Select
                value={form.mealType}
                onValueChange={(v) =>
                  setForm((s) => ({ ...s, mealType: v as MealType }))
                }
              >
                <SelectTrigger data-ocid="dashboard.meal_type_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPE_ORDER.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {MEAL_TYPE_LABELS[mt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meal-portion">Portion</Label>
              <Input
                id="meal-portion"
                data-ocid="dashboard.meal_portion_input"
                placeholder="e.g. 1 bowl"
                value={form.portionSize}
                onChange={(e) =>
                  setForm((s) => ({ ...s, portionSize: e.target.value }))
                }
              />
            </div>
          </div>

          {!estimated ? (
            <Button
              data-ocid="dashboard.estimate_meal_button"
              variant="secondary"
              className="w-full"
              onClick={handleEstimate}
              disabled={estimate.isPending}
            >
              {estimate.isPending ? "Estimating…" : "Estimate Calories"}
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Estimated — adjust if needed
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="meal-cal">Calories</Label>
                <Input
                  id="meal-cal"
                  data-ocid="dashboard.meal_cal_input"
                  type="number"
                  min={0}
                  value={form.calories}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      calories: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MacroInput
                  label="Protein (g)"
                  value={form.protein}
                  onChange={(v) => setForm((s) => ({ ...s, protein: v }))}
                  ocid="dashboard.meal_protein_input"
                />
                <MacroInput
                  label="Carbs (g)"
                  value={form.carbs}
                  onChange={(v) => setForm((s) => ({ ...s, carbs: v }))}
                  ocid="dashboard.meal_carbs_input"
                />
                <MacroInput
                  label="Fat (g)"
                  value={form.fat}
                  onChange={(v) => setForm((s) => ({ ...s, fat: v }))}
                  ocid="dashboard.meal_fat_input"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            data-ocid="dashboard.cancel_meal_button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            data-ocid="dashboard.save_meal_button"
            onClick={handleSave}
            disabled={!estimated || addMeal.isPending || updateMeal.isPending}
          >
            {addMeal.isPending || updateMeal.isPending
              ? "Saving…"
              : isEdit
                ? "Update Meal"
                : "Save Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function buildMealInput(form: MealFormState) {
  return {
    date: TODAY,
    description: form.description.trim(),
    portionSize: form.portionSize.trim() || undefined,
    mealType: form.mealType,
    photo: form.photo ? await fileToBytes(form.photo) : undefined,
  };
}

function MacroInput({
  label,
  value,
  onChange,
  ocid,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  ocid: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        data-ocid={ocid}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  5. Add / edit exercise                                                     */
/* -------------------------------------------------------------------------- */

interface ExerciseFormState {
  exerciseType: string;
  durationMin: number;
  intensity: Intensity;
  distance: string;
  caloriesBurned: number;
}

const EMPTY_EX: ExerciseFormState = {
  exerciseType: "",
  durationMin: 30,
  intensity: "moderate",
  distance: "",
  caloriesBurned: 0,
};

function AddExerciseSection() {
  return (
    <section data-ocid="dashboard.add_exercise" className="space-y-2">
      <ExerciseDialog
        trigger={
          <Button
            data-ocid="dashboard.add_exercise_button"
            variant="secondary"
            className="w-full"
            size="lg"
          >
            <Plus className="mr-1 h-4 w-4" /> Log Exercise
          </Button>
        }
      />
    </section>
  );
}

function ExerciseDialog({
  trigger,
  exercise,
}: {
  trigger: React.ReactNode;
  exercise?: Exercise;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExerciseFormState>(EMPTY_EX);
  const [estimated, setEstimated] = useState(false);
  const estimate = useEstimateExercise();
  const addExercise = useAddExercise(TODAY);
  const updateExercise = useUpdateExercise(TODAY);

  const isEdit = !!exercise;

  const openDialog = () => {
    if (exercise) {
      setForm({
        exerciseType: exercise.exerciseType,
        durationMin: exercise.durationMin,
        intensity: exercise.intensity ?? "moderate",
        distance: exercise.distance?.toString() ?? "",
        caloriesBurned: exercise.caloriesBurned,
      });
      setEstimated(true);
    } else {
      setForm(EMPTY_EX);
      setEstimated(false);
    }
    setOpen(true);
  };

  const handleEstimate = () => {
    if (!form.exerciseType.trim()) {
      toast.error("What did you do? Add a type.");
      return;
    }
    if (form.durationMin <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }
    const input = {
      date: TODAY,
      exerciseType: form.exerciseType.trim(),
      durationMin: form.durationMin,
      intensity: form.intensity,
      distance: form.distance ? Number(form.distance) : undefined,
    };
    estimate.mutate(input, {
      onSuccess: (res) => {
        if ("code" in res) {
          toast.error(res.message || "Estimate failed — try again");
          return;
        }
        setForm((f) => ({ ...f, caloriesBurned: res.caloriesBurned }));
        setEstimated(true);
        toast.success("Estimated! Adjust if needed.");
      },
      onError: () => toast.error("Estimate failed — try again"),
    });
  };

  const handleSave = () => {
    if (!form.exerciseType.trim()) {
      toast.error("Add an exercise type");
      return;
    }
    if (form.caloriesBurned <= 0) {
      toast.error("Calories must be greater than 0");
      return;
    }
    const input = {
      date: TODAY,
      exerciseType: form.exerciseType.trim(),
      durationMin: form.durationMin,
      intensity: form.intensity,
      distance: form.distance ? Number(form.distance) : undefined,
    };
    const mutation = isEdit
      ? updateExercise.mutateAsync({
          exerciseId: exercise!.id,
          input,
          caloriesBurned: form.caloriesBurned,
        })
      : addExercise.mutateAsync({ input, caloriesBurned: form.caloriesBurned });

    mutation
      .then(() => {
        toast.success(
          isEdit ? "Exercise updated!" : "Movement logged — great work!",
        );
        setOpen(false);
      })
      .catch(() => toast.error("Couldn't save exercise"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={openDialog}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        data-ocid="dashboard.exercise_dialog"
        className="max-h-[90vh] overflow-y-auto sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exercise" : "Log Exercise"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details below."
              : "Tell us how you moved. We'll estimate calories burned."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ex-type">Exercise type</Label>
            <Input
              id="ex-type"
              data-ocid="dashboard.ex_type_input"
              placeholder="e.g. Running, Cycling, Yoga"
              value={form.exerciseType}
              onChange={(e) => {
                setForm((s) => ({ ...s, exerciseType: e.target.value }));
                setEstimated(false);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ex-duration">Duration (min)</Label>
              <Input
                id="ex-duration"
                data-ocid="dashboard.ex_duration_input"
                type="number"
                min={1}
                value={form.durationMin}
                onChange={(e) => {
                  setForm((s) => ({
                    ...s,
                    durationMin: Number(e.target.value) || 0,
                  }));
                  setEstimated(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Intensity</Label>
              <Select
                value={form.intensity}
                onValueChange={(v) => {
                  setForm((s) => ({ ...s, intensity: v as Intensity }));
                  setEstimated(false);
                }}
              >
                <SelectTrigger data-ocid="dashboard.ex_intensity_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {INTENSITY_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ex-distance">Distance (optional)</Label>
            <Input
              id="ex-distance"
              data-ocid="dashboard.ex_distance_input"
              type="number"
              min={0}
              step="0.1"
              placeholder="km"
              value={form.distance}
              onChange={(e) =>
                setForm((s) => ({ ...s, distance: e.target.value }))
              }
            />
          </div>

          {!estimated ? (
            <Button
              data-ocid="dashboard.estimate_ex_button"
              variant="secondary"
              className="w-full"
              onClick={handleEstimate}
              disabled={estimate.isPending}
            >
              {estimate.isPending ? "Estimating…" : "Estimate Calories"}
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Estimated — adjust if needed
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="ex-cal">Calories burned</Label>
                <Input
                  id="ex-cal"
                  data-ocid="dashboard.ex_cal_input"
                  type="number"
                  min={0}
                  value={form.caloriesBurned}
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      caloriesBurned: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            data-ocid="dashboard.cancel_ex_button"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            data-ocid="dashboard.save_ex_button"
            onClick={handleSave}
            disabled={
              !estimated || addExercise.isPending || updateExercise.isPending
            }
          >
            {addExercise.isPending || updateExercise.isPending
              ? "Saving…"
              : isEdit
                ? "Update Exercise"
                : "Save Exercise"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  6. Today's meals                                                           */
/* -------------------------------------------------------------------------- */

function TodayMeals() {
  const { data, isLoading } = useMeals(TODAY);
  const del = useDeleteMeal(TODAY);

  const grouped = useMemo(() => {
    const map: Record<MealType, Meal[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const m of data ?? []) {
      map[m.mealType].push(m);
    }
    return map;
  }, [data]);

  const total = (data ?? []).reduce((s, m) => s + m.calories, 0);

  return (
    <section data-ocid="dashboard.meals" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Today's Meals
        </h2>
        <span className="text-sm text-muted-foreground">{total} kcal</span>
      </div>

      {isLoading ? (
        <Card className="border-border bg-card shadow-warm">
          <CardContent className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        </Card>
      ) : !data || data.length === 0 ? (
        <Card
          data-ocid="dashboard.meals_empty_state"
          className="border-dashed border-border bg-card"
        >
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Utensils className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No meals logged yet
            </p>
            <p className="text-xs text-muted-foreground">
              Tap "Log a Meal" to start tracking your fuel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {MEAL_TYPE_ORDER.map((mt) =>
            grouped[mt].length === 0 ? null : (
              <div key={mt} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {MEAL_TYPE_LABELS[mt]}
                </p>
                <div className="space-y-2">
                  {grouped[mt].map((meal, i) => (
                    <MealRow
                      key={meal.id}
                      meal={meal}
                      index={i}
                      onDelete={() =>
                        del.mutate(meal.id, {
                          onSuccess: () => toast.success("Meal removed"),
                          onError: () => toast.error("Couldn't delete"),
                        })
                      }
                      deleting={del.isPending}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function MealRow({
  meal,
  index,
  onDelete,
  deleting,
}: {
  meal: Meal;
  index: number;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Card
      data-ocid={`dashboard.meals.item.${index + 1}`}
      className="border-border bg-card shadow-warm"
    >
      <CardContent className="flex items-center gap-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Utensils className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {meal.description}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {meal.calories} kcal · P{meal.macros.protein} C{meal.macros.carbs} F
            {meal.macros.fat}
            {meal.portionSize ? ` · ${meal.portionSize}` : ""}
          </p>
        </div>
        <MealDialog
          trigger={
            <Button
              data-ocid={`dashboard.meals.edit_button.${index + 1}`}
              variant="ghost"
              size="icon"
              aria-label="Edit meal"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          }
          meal={meal}
        />
        <Button
          data-ocid={`dashboard.meals.delete_button.${index + 1}`}
          variant="ghost"
          size="icon"
          aria-label="Delete meal"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  7. Today's exercises                                                       */
/* -------------------------------------------------------------------------- */

function TodayExercises() {
  const { data, isLoading } = useExercises(TODAY);
  const del = useDeleteExercise(TODAY);

  const total = (data ?? []).reduce((s, e) => s + e.caloriesBurned, 0);

  return (
    <section data-ocid="dashboard.exercises" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Today's Exercise
        </h2>
        <span className="text-sm text-muted-foreground">{total} kcal</span>
      </div>

      {isLoading ? (
        <Card className="border-border bg-card shadow-warm">
          <CardContent className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        </Card>
      ) : !data || data.length === 0 ? (
        <Card
          data-ocid="dashboard.exercises_empty_state"
          className="border-dashed border-border bg-card"
        >
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              No exercise logged yet
            </p>
            <p className="text-xs text-muted-foreground">
              Tap "Log Exercise" to record your movement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              exercise={ex}
              index={i}
              onDelete={() =>
                del.mutate(ex.id, {
                  onSuccess: () => toast.success("Exercise removed"),
                  onError: () => toast.error("Couldn't delete"),
                })
              }
              deleting={del.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ExerciseRow({
  exercise,
  index,
  onDelete,
  deleting,
}: {
  exercise: Exercise;
  index: number;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <Card
      data-ocid={`dashboard.exercises.item.${index + 1}`}
      className="border-border bg-card shadow-warm"
    >
      <CardContent className="flex items-center gap-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-foreground">
          <Dumbbell className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {exercise.exerciseType}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {exercise.durationMin} min
            {exercise.intensity
              ? ` · ${INTENSITY_LABELS[exercise.intensity]}`
              : ""}
            {exercise.distance ? ` · ${exercise.distance} km` : ""}
          </p>
        </div>
        <span className="text-sm font-semibold text-accent-foreground">
          {exercise.caloriesBurned} kcal
        </span>
        <ExerciseDialog
          trigger={
            <Button
              data-ocid={`dashboard.exercises.edit_button.${index + 1}`}
              variant="ghost"
              size="icon"
              aria-label="Edit exercise"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          }
          exercise={exercise}
        />
        <Button
          data-ocid={`dashboard.exercises.delete_button.${index + 1}`}
          variant="ghost"
          size="icon"
          aria-label="Delete exercise"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}
