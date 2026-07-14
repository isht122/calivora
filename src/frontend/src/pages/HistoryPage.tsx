import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import {
  type DailySummary,
  type Exercise,
  INTENSITY_LABELS,
  MEAL_TYPE_LABELS,
  type Meal,
  type StepEntry,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Pencil,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*  Date helpers                                                              */
/* -------------------------------------------------------------------------- */

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function relativeDay(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, -1)) return "Yesterday";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/* -------------------------------------------------------------------------- */
/*  Trend chart                                                               */
/* -------------------------------------------------------------------------- */

interface TrendDatum {
  date: string;
  netBalance: number;
  label: string;
}

function TrendChart({
  data,
  loading,
}: { data: TrendDatum[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="h-64 w-full">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <div
        data-ocid="history.trend.empty_state"
        className="flex h-64 flex-col items-center justify-center gap-2 text-center"
      >
        <TrendingUp className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          No trend data yet — log a few days and your balance will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="oklch(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "oklch(var(--muted) / 0.6)", radius: 8 }}
            contentStyle={{
              borderRadius: "0.75rem",
              border: "1px solid oklch(var(--border))",
              background: "oklch(var(--popover))",
              fontSize: "0.8rem",
              boxShadow: "0 4px 14px -2px oklch(var(--chart-5) / 0.18)",
            }}
            labelStyle={{ fontWeight: 600, color: "oklch(var(--foreground))" }}
            formatter={(value: number) => [
              `${value > 0 ? "+" : ""}${value} kcal`,
              "Net balance",
            ]}
          />
          <ReferenceLine
            y={0}
            stroke="oklch(var(--muted-foreground))"
            strokeWidth={1}
          />
          <Bar dataKey="netBalance" radius={[6, 6, 6, 6]} maxBarSize={42}>
            {data.map((d) => (
              <Cell
                key={d.date}
                fill={
                  d.netBalance >= 0
                    ? "oklch(var(--chart-5))"
                    : "oklch(var(--chart-4))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Stat card                                                                 */
/* -------------------------------------------------------------------------- */

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "accent" | "success";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent-foreground",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <Card className="border-border bg-card shadow-warm">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-8 items-center justify-center rounded-lg ${toneClasses[tone]}`}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold text-foreground">
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Day row                                                                   */
/* -------------------------------------------------------------------------- */

function DayRow({
  summary,
  index,
  onOpen,
}: {
  summary: DailySummary;
  index: number;
  onOpen: () => void;
}) {
  const positive = summary.netBalance >= 0;
  return (
    <button
      type="button"
      data-ocid={`history.day.item.${index + 1}`}
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-warm transition-smooth hover:border-primary/40 hover:shadow-warm-lg focus-visible:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-semibold text-foreground">
            {relativeDay(summary.date)}
          </span>
          <span className="text-xs text-muted-foreground">
            {shortLabel(summary.date)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ArrowDownRight className="size-3 text-success" aria-hidden />
            {summary.caloriesIn} in
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowUpRight className="size-3 text-primary" aria-hidden />
            {summary.caloriesOut} out
          </span>
          <span className="inline-flex items-center gap-1">
            <Footprints className="size-3 text-accent-foreground" aria-hidden />
            {summary.steps.toLocaleString()} steps
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span
          className={`font-display text-lg font-bold ${
            positive ? "text-accent-foreground" : "text-success"
          }`}
        >
          {positive ? "+" : ""}
          {summary.netBalance}
        </span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          net kcal
        </span>
      </div>
      <ChevronRight
        className="size-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Day detail dialog                                                         */
/* -------------------------------------------------------------------------- */

function MacroBar({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const total = protein + carbs + fat || 1;
  const seg = (g: number) => `${(g / total) * 100}%`;
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="bg-primary"
          style={{ width: seg(protein) }}
          aria-label="Protein share"
        />
        <div
          className="bg-accent"
          style={{ width: seg(carbs) }}
          aria-label="Carbs share"
        />
        <div
          className="bg-warning"
          style={{ width: seg(fat) }}
          aria-label="Fat share"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-primary">{protein}g</span> protein
        </span>
        <span>
          <span className="font-semibold text-accent-foreground">{carbs}g</span>{" "}
          carbs
        </span>
        <span>
          <span className="font-semibold text-warning-foreground">{fat}g</span>{" "}
          fat
        </span>
      </div>
    </div>
  );
}

function DayDetailDialog({
  date,
  open,
  onOpenChange,
}: {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { actor, email, sessionToken } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ["daily-summary", date],
    queryFn: async () => {
      if (!actor || !email || !sessionToken || !date) return null;
      return api.getDailySummary(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken && !!date && open,
  });

  const mealsQuery = useQuery({
    queryKey: ["day-meals", date],
    queryFn: async () => {
      if (!actor || !email || !sessionToken || !date) return [] as Meal[];
      return api.listMeals(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken && !!date && open,
  });

  const exercisesQuery = useQuery({
    queryKey: ["day-exercises", date],
    queryFn: async () => {
      if (!actor || !email || !sessionToken || !date) return [] as Exercise[];
      return api.listExercises(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken && !!date && open,
  });

  const stepsQuery = useQuery({
    queryKey: ["day-steps", date],
    queryFn: async (): Promise<StepEntry | null> => {
      if (!actor || !email || !sessionToken || !date) return null;
      return api.getSteps(actor, sessionToken, email, date);
    },
    enabled: !!actor && !!email && !!sessionToken && !!date && open,
  });

  const summary = summaryQuery.data;
  const meals = mealsQuery.data ?? [];
  const exercises = exercisesQuery.data ?? [];
  const steps = stepsQuery.data;

  const loading =
    summaryQuery.isLoading || mealsQuery.isLoading || exercisesQuery.isLoading;

  async function handleDeleteMeal(mealId: number) {
    if (!actor || !sessionToken) return;
    try {
      await api.deleteMeal(actor, sessionToken, mealId);
      toast.success("Meal removed. You can re-log it anytime.");
      void mealsQuery.refetch();
      void summaryQuery.refetch();
    } catch {
      toast.error("Couldn't delete that meal. Try again?");
    }
  }

  async function handleDeleteExercise(exerciseId: number) {
    if (!actor || !sessionToken) return;
    try {
      await api.deleteExercise(actor, sessionToken, exerciseId);
      toast.success("Exercise removed. Nice work logging it!");
      void exercisesQuery.refetch();
      void summaryQuery.refetch();
    } catch {
      toast.error("Couldn't delete that exercise. Try again?");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="history.day.dialog"
        className="max-h-[88vh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {date ? prettyDate(date) : "Day"}
          </DialogTitle>
          <DialogDescription>
            A full look at your day — read-only, with quick edits for meals and
            exercise.
          </DialogDescription>
        </DialogHeader>

        {loading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowDownRight className="size-3 text-success" aria-hidden />
                  Calories in
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {summary.caloriesIn}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    kcal
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowUpRight className="size-3 text-primary" aria-hidden />
                  Calories out
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {summary.caloriesOut}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    kcal
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Scale
                    className="size-3 text-accent-foreground"
                    aria-hidden
                  />
                  Net balance
                </div>
                <p
                  className={`font-display text-xl font-bold ${
                    summary.netBalance >= 0
                      ? "text-accent-foreground"
                      : "text-success"
                  }`}
                >
                  {summary.netBalance >= 0 ? "+" : ""}
                  {summary.netBalance}
                  <span className="text-xs font-normal text-muted-foreground">
                    {" "}
                    kcal
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Footprints
                    className="size-3 text-accent-foreground"
                    aria-hidden
                  />
                  Steps
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  {summary.steps.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Out breakdown */}
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Energy out breakdown
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  <span className="font-semibold text-foreground">BMR</span>{" "}
                  {summary.bmr} kcal
                </span>
                <span>
                  <span className="font-semibold text-foreground">
                    Exercise
                  </span>{" "}
                  {summary.exerciseCalories} kcal
                </span>
                <span>
                  <span className="font-semibold text-foreground">Steps</span>{" "}
                  {summary.stepCalories} kcal
                </span>
              </div>
            </div>

            {/* Macros */}
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Macro breakdown
              </p>
              <MacroBar {...summary.macroBreakdown} />
            </div>

            {/* Meals */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Utensils className="size-4 text-primary" aria-hidden />
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Meals
                </h3>
                <Badge variant="secondary" className="ml-auto">
                  {meals.length}
                </Badge>
              </div>
              {meals.length === 0 ? (
                <p
                  data-ocid="history.day.meals.empty_state"
                  className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground"
                >
                  No meals logged this day.
                </p>
              ) : (
                <ul className="space-y-2">
                  {meals.map((m, i) => (
                    <li
                      key={m.id}
                      data-ocid={`history.day.meal.item.${i + 1}`}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {MEAL_TYPE_LABELS[m.mealType]}
                          </Badge>
                          <span className="font-medium text-sm text-foreground">
                            {m.calories} kcal
                          </span>
                        </div>
                        <p className="truncate text-sm text-foreground">
                          {m.description}
                        </p>
                        {m.portionSize && (
                          <p className="text-xs text-muted-foreground">
                            {m.portionSize}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          P {m.macros.protein}g · C {m.macros.carbs}g · F{" "}
                          {m.macros.fat}g
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Edit meal"
                          data-ocid={`history.day.meal.edit_button.${i + 1}`}
                          onClick={() =>
                            toast.info(
                              "Editing meals from history opens in a future update.",
                            )
                          }
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete meal"
                          data-ocid={`history.day.meal.delete_button.${i + 1}`}
                          onClick={() => handleDeleteMeal(m.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dumbbell className="size-4 text-primary" aria-hidden />
                <h3 className="font-display text-sm font-semibold text-foreground">
                  Exercise
                </h3>
                <Badge variant="secondary" className="ml-auto">
                  {exercises.length}
                </Badge>
              </div>
              {exercises.length === 0 ? (
                <p
                  data-ocid="history.day.exercises.empty_state"
                  className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground"
                >
                  No exercise logged this day.
                </p>
              ) : (
                <ul className="space-y-2">
                  {exercises.map((e, i) => (
                    <li
                      key={e.id}
                      data-ocid={`history.day.exercise.item.${i + 1}`}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {e.exerciseType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {e.caloriesBurned} kcal
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {e.durationMin} min
                          {e.distance != null ? ` · ${e.distance} km` : ""}
                          {e.intensity
                            ? ` · ${INTENSITY_LABELS[e.intensity]}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Edit exercise"
                          data-ocid={`history.day.exercise.edit_button.${i + 1}`}
                          onClick={() =>
                            toast.info(
                              "Editing exercises from history opens in a future update.",
                            )
                          }
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Delete exercise"
                          data-ocid={`history.day.exercise.delete_button.${i + 1}`}
                          onClick={() => handleDeleteExercise(e.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Steps detail */}
            {steps && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Footprints
                  className="size-5 text-accent-foreground"
                  aria-hidden
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {steps.steps.toLocaleString()} steps
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {steps.calories} kcal burned from steps
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*  History page                                                              */
/* -------------------------------------------------------------------------- */

export function HistoryPage() {
  const { actor, email, sessionToken } = useAuth();
  const [range, setRange] = useState<7 | 30>(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  /* Trend data ------------------------------------------------------------- */
  const trendQuery = useQuery({
    queryKey: ["net-balance-trend", range],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) return [];
      return api.getNetBalanceTrend(actor, sessionToken, email, range);
    },
    enabled: !!actor && !!email && !!sessionToken,
  });

  const trendData: TrendDatum[] = useMemo(
    () =>
      (trendQuery.data ?? [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({
          date: p.date,
          netBalance: p.netBalance,
          label: shortLabel(p.date),
        })),
    [trendQuery.data],
  );

  /* Day list — last 14 days ----------------------------------------------- */
  const listStart = addDaysISO(todayISO(), -13);
  const listEnd = todayISO();
  const rangeQuery = useQuery({
    queryKey: ["history-range", listStart, listEnd],
    queryFn: async () => {
      if (!actor || !email || !sessionToken) return [] as DailySummary[];
      return api.getHistoryRange(
        actor,
        sessionToken,
        email,
        listStart,
        listEnd,
      );
    },
    enabled: !!actor && !!email && !!sessionToken,
  });

  const dayList: DailySummary[] = useMemo(
    () =>
      (rangeQuery.data ?? [])
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date)),
    [rangeQuery.data],
  );

  /* Weekly averages -------------------------------------------------------- */
  const weekly = useMemo(() => {
    const last7 = (rangeQuery.data ?? [])
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
    if (last7.length === 0) {
      return { net: 0, in: 0, out: 0, count: 0 };
    }
    const sum = last7.reduce(
      (acc, d) => ({
        net: acc.net + d.netBalance,
        in: acc.in + d.caloriesIn,
        out: acc.out + d.caloriesOut,
      }),
      { net: 0, in: 0, out: 0 },
    );
    return {
      net: Math.round(sum.net / last7.length),
      in: Math.round(sum.in / last7.length),
      out: Math.round(sum.out / last7.length),
      count: last7.length,
    };
  }, [rangeQuery.data]);

  function openDay(date: string) {
    setSelectedDate(date);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-5 pb-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-bold text-foreground">
          History
        </h1>
        <p className="text-sm text-muted-foreground">
          Look back and see how far you've come. Every day counts.
        </p>
      </header>

      {/* Trend chart card */}
      <Card className="border-border bg-card shadow-warm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" aria-hidden />
                Net Calorie Balance
              </CardTitle>
              <CardDescription className="text-xs">
                Surplus (citrus) vs. deficit (green) over time.
              </CardDescription>
            </div>
            <Tabs
              value={String(range)}
              onValueChange={(v) => setRange(v === "30" ? 30 : 7)}
            >
              <TabsList data-ocid="history.trend.range" className="h-8 p-0.5">
                <TabsTrigger
                  value="7"
                  data-ocid="history.trend.range.tab.7"
                  className="h-7 px-3 text-xs"
                >
                  7d
                </TabsTrigger>
                <TabsTrigger
                  value="30"
                  data-ocid="history.trend.range.tab.30"
                  className="h-7 px-3 text-xs"
                >
                  30d
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <TrendChart data={trendData} loading={trendQuery.isLoading} />
        </CardContent>
      </Card>

      {/* Weekly averages */}
      <section data-ocid="history.weekly.section">
        <h2 className="mb-2 font-display text-sm font-semibold text-foreground">
          Weekly averages
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="Net"
            value={weekly.count > 0 ? String(weekly.net) : "—"}
            unit="kcal"
            icon={weekly.net >= 0 ? TrendingUp : TrendingDown}
            tone="primary"
          />
          <StatCard
            label="Calories in"
            value={weekly.count > 0 ? String(weekly.in) : "—"}
            unit="kcal"
            icon={Flame}
            tone="accent"
          />
          <StatCard
            label="Calories out"
            value={weekly.count > 0 ? String(weekly.out) : "—"}
            unit="kcal"
            icon={ArrowUpRight}
            tone="success"
          />
        </div>
      </section>

      {/* Day list */}
      <section data-ocid="history.days.section">
        <h2 className="mb-2 font-display text-sm font-semibold text-foreground">
          Recent days
        </h2>
        {rangeQuery.isLoading ? (
          <div className="space-y-2">
            {["a", "b", "c", "d"].map((id, i) => (
              <Skeleton
                key={id}
                data-ocid={`history.day.loading_state.${i + 1}`}
                className="h-16 w-full rounded-2xl"
              />
            ))}
          </div>
        ) : dayList.length === 0 ? (
          <div
            data-ocid="history.days.empty_state"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Activity className="size-6 text-primary" aria-hidden />
            </div>
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                Your history starts here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Log meals, exercise, or steps today and this list will fill up.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {dayList.map((d, i) => (
              <DayRow
                key={d.date}
                summary={d}
                index={i}
                onOpen={() => openDay(d.date)}
              />
            ))}
          </div>
        )}
      </section>

      <DayDetailDialog
        date={selectedDate}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
