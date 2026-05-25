import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useExpenses, useBudget } from "@/hooks/use-finova-store";
import { formatINR } from "@/lib/format";
import { getAiTip } from "@/lib/ai-tips.functions";
import { PreviousTransactions } from "@/components/PreviousTransactions";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  isWithinInterval, parseISO, format, subDays, eachDayOfInterval,
  subMonths, getDate, getDaysInMonth,
} from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
  head: () => ({
    meta: [
      { title: "Insights — FinNova" },
      { name: "description", content: "View spending trends, category breakdown, and smart insights." },
    ],
  }),
});

const PIE_COLORS = [
  "oklch(0.55 0.22 265)",
  "oklch(0.6 0.2 290)",
  "oklch(0.65 0.18 180)",
  "oklch(0.7 0.18 50)",
  "oklch(0.6 0.22 330)",
  "oklch(0.65 0.2 145)",
  "oklch(0.7 0.15 80)",
  "oklch(0.5 0.03 270)",
];

function InsightsPage() {
  const { expenses } = useExpenses();
  const { budget } = useBudget();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const stats = useMemo(() => {
    let totalM = 0;
    let totalW = 0;
    let totalPrev = 0;
    const catMap: Record<string, number> = {};
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    for (const e of expenses) {
      const d = parseISO(e.date);
      if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
        totalM += e.amount;
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      }
      if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
        totalW += e.amount;
      }
      if (isWithinInterval(d, { start: prevStart, end: prevEnd })) {
        totalPrev += e.amount;
      }
    }

    const catData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const top = catData[0] || null;
    const topShare = top && totalM > 0 ? top.value / totalM : 0;

    // Predicted month-end based on current daily pace
    const dayOfMonth = getDate(now);
    const daysInMonth = getDaysInMonth(now);
    const dailyPace = dayOfMonth > 0 ? totalM / dayOfMonth : 0;
    const predicted = dailyPace * daysInMonth;

    // Trend: last 14 days
    const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
    const dayMap: Record<string, number> = {};
    for (const e of expenses) {
      const key = format(parseISO(e.date), "MM/dd");
      dayMap[key] = (dayMap[key] || 0) + e.amount;
    }
    const trend = days.map((d) => ({
      date: format(d, "dd"),
      amount: dayMap[format(d, "MM/dd")] || 0,
    }));

    return {
      totalMonth: totalM,
      totalWeek: totalW,
      totalPrev,
      categoryData: catData,
      topCategory: top,
      topShare,
      predicted,
      trendData: trend,
    };
  }, [expenses, monthStart, monthEnd, weekStart, weekEnd, now]);

  // MoM comparison
  const momPct = stats.totalPrev > 0
    ? ((stats.totalMonth - stats.totalPrev) / stats.totalPrev) * 100
    : null;
  const momLabel =
    momPct === null
      ? "No data from last month yet"
      : momPct < 0
        ? `You spent ${Math.abs(momPct).toFixed(0)}% less than last month`
        : momPct > 0
          ? `You spent ${momPct.toFixed(0)}% more than last month`
          : "On par with last month";

  // AI tip
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Build a stable signature so we don't re-fetch on every render
  const sig = useMemo(
    () =>
      [
        stats.topCategory?.name ?? "-",
        Math.round(stats.totalMonth),
        Math.round(stats.totalPrev),
        Math.round(stats.predicted),
        Math.round(budget.monthly),
      ].join("|"),
    [stats.topCategory, stats.totalMonth, stats.totalPrev, stats.predicted, budget.monthly]
  );

  useEffect(() => {
    if (stats.totalMonth <= 0) {
      setAiTip(null);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);
    getAiTip({
      topCategory: stats.topCategory?.name ?? null,
      topShare: stats.topShare,
      totalMonth: stats.totalMonth,
      prevMonthTotal: stats.totalPrev,
      predictedMonthEnd: stats.predicted,
      budget: budget.monthly,
    })
      .then((res) => {
        if (cancelled) return;
        setAiTip(res.tip);
        setAiError(res.error);
      })
      .catch(() => {
        if (cancelled) return;
        setAiError("network");
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const aiErrorMsg =
    aiError === "rate-limit"
      ? "AI tips are rate-limited, try again soon."
      : aiError === "credits"
        ? "Add Lovable AI credits to unlock tips."
        : aiError
          ? "AI tip unavailable right now."
          : null;

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="text-xl font-bold text-foreground mb-6">Insights</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="finova-card p-4">
          <p className="text-xs text-muted-foreground mb-1">This Month</p>
          <p className="text-lg font-bold text-foreground">{formatINR(stats.totalMonth)}</p>
        </div>
        <div className="finova-card p-4">
          <p className="text-xs text-muted-foreground mb-1">This Week</p>
          <p className="text-lg font-bold text-foreground">{formatINR(stats.totalWeek)}</p>
        </div>
      </div>

      {/* Previous Transactions — blends as a quiet card above the brief */}
      <PreviousTransactions />

      {/* Smart Brief — compact, condenses MoM + predicted + AI tip */}
      <div className="finova-card gradient-card p-4 mb-6 relative overflow-hidden">
        <div className="ambient-orbs opacity-40 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <span>✨</span> Smart Brief
            </p>
            {aiLoading && (
              <span className="text-[10px] text-muted-foreground animate-pulse">
                Thinking…
              </span>
            )}
          </div>

          {/* Compact stat row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <BriefStat
              label="Top"
              value={stats.topCategory?.name ?? "—"}
              sub={
                stats.topCategory
                  ? `${Math.round(stats.topShare * 100)}%`
                  : "no data"
              }
            />
            <BriefStat
              label="vs Last"
              value={
                momPct === null
                  ? "—"
                  : `${momPct < 0 ? "▼" : momPct > 0 ? "▲" : "•"} ${Math.abs(
                      momPct
                    ).toFixed(0)}%`
              }
              sub={momPct === null ? "no data" : "month over month"}
              tone={momPct !== null && momPct < 0 ? "good" : momPct !== null && momPct > 0 ? "warn" : "neutral"}
            />
            <BriefStat
              label="Predicted"
              value={stats.predicted > 0 ? formatINR(Math.round(stats.predicted)) : "—"}
              sub="end of month"
            />
          </div>

          {/* MoM line */}
          {stats.totalMonth > 0 && (
            <p className="text-xs text-foreground/90 mb-2">
              {momLabel}.
              {budget.monthly > 0 && stats.predicted > budget.monthly && (
                <span className="text-destructive font-medium">
                  {" "}On pace to exceed your ₹{Math.round(budget.monthly).toLocaleString("en-IN")} budget.
                </span>
              )}
            </p>
          )}

          {/* AI tip */}
          {stats.totalMonth > 0 && (
            <div className="rounded-lg bg-card/60 backdrop-blur px-3 py-2 border border-border/60">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                AI Tip
              </p>
              {aiLoading && !aiTip ? (
                <div className="space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              ) : aiTip ? (
                <p className="text-sm text-foreground leading-snug">{aiTip}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {aiErrorMsg ?? "Add a few expenses to get a personalised tip."}
                </p>
              )}
            </div>
          )}

          {stats.totalMonth <= 0 && (
            <p className="text-sm text-muted-foreground">
              Log some expenses to unlock month-over-month comparison, predictions, and AI tips.
            </p>
          )}
        </div>
      </div>

      {/* Spending Trend */}
      <div className="finova-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Spending Trend (14 days)</h2>
        {stats.trendData.every((d) => d.amount === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" width={45} tickFormatter={(v: number) => `₹${v}`} />
              <Tooltip
                formatter={(value: any) => [formatINR(Number(value)), "Spent"]}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }}
              />
              <Line type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category Pie */}
      <div className="finova-card p-4 mb-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Category Breakdown</h2>
        {stats.categoryData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                  {stats.categoryData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatINR(Number(value))} contentStyle={{ borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{c.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BriefStat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-success"
      : tone === "warn"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div className="rounded-lg bg-card/60 backdrop-blur px-2.5 py-2 border border-border/60">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold leading-tight truncate ${toneClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
