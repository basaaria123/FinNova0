import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useExpenses, useBudget, useAuth } from "@/hooks/use-finova-store";
import { formatINR } from "@/lib/format";
import { CATEGORIES } from "@/lib/types";
import finovaLogo from "@/assets/finova-logo.png";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, parseISO, format,
} from "date-fns";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "FinNova — Smart Expense Tracker" },
      { name: "description", content: "Track expenses, manage budgets, and get smart spending insights in INR." },
    ],
  }),
});

function Dashboard() {
  const { expenses, deleteExpense } = useExpenses();
  const { budget } = useBudget();
  const { user } = useAuth();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { totalMonth, totalWeek, remaining, budgetPct } = useMemo(() => {
    let totalM = 0;
    let totalW = 0;
    for (const e of expenses) {
      const d = parseISO(e.date);
      if (isWithinInterval(d, { start: monthStart, end: monthEnd })) totalM += e.amount;
      if (isWithinInterval(d, { start: weekStart, end: weekEnd })) totalW += e.amount;
    }
    const rem = budget.monthly > 0 ? budget.monthly - totalM : 0;
    const pct = budget.monthly > 0 ? Math.min((totalM / budget.monthly) * 100, 100) : 0;
    return { totalMonth: totalM, totalWeek: totalW, remaining: rem, budgetPct: pct };
  }, [expenses, budget, monthStart, monthEnd, weekStart, weekEnd]);

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="relative px-4 pb-24 pt-6">
      <div className="ambient-orbs" />
      <div className="relative z-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-glow">
            <img src={finovaLogo} alt="FinNova" width={40} height={40} className="h-full w-full object-contain" />
          </div>
          <h1 className="font-brand text-lg" style={{ color: 'var(--finova-metal-blue)' }}>
            <span style={{ opacity: 0.85 }}>Fin</span>Nova
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Hi, {user?.name?.split(' ')[0] || 'there'} 👋</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <SummaryCard label="This Month" value={formatINR(totalMonth)} accent delay={0} />
        <SummaryCard label="This Week" value={formatINR(totalWeek)} delay={100} />
      </div>

      {/* Budget Card */}
      {budget.monthly > 0 && (
        <div className="finova-card p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Monthly Budget</span>
            <span className="text-sm font-semibold text-foreground">{formatINR(budget.monthly)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${budgetPct}%`,
                background: budgetPct > 90
                  ? "oklch(0.58 0.24 27)"
                  : budgetPct > 70
                    ? "oklch(0.75 0.18 70)"
                    : "var(--gradient-primary)",
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Spent: {formatINR(totalMonth)}</span>
            <span className={remaining < 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>
              {remaining >= 0 ? `Left: ${formatINR(remaining)}` : `Over: ${formatINR(Math.abs(remaining))}`}
            </span>
          </div>
          {budgetPct > 80 && (
            <div className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${
              budgetPct >= 100
                ? "bg-destructive/10 text-destructive"
                : "bg-warning/10 text-warning"
            }`}>
              {budgetPct >= 100
                ? "⚠️ You've exceeded your monthly budget!"
                : "⚡ You're nearing your budget limit"}
            </div>
          )}
        </div>
      )}

      {/* Recent Expenses */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground mb-3">Recent Expenses</h2>
        {recentExpenses.length === 0 ? (
          <div className="finova-card p-8 text-center">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm text-muted-foreground">No expenses yet. Start tracking!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((e) => {
              const cat = CATEGORIES.find((c) => c.name === e.category);
              return (
                <div key={e.id} className="finova-card flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                    {cat?.icon || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(e.date), "dd MMM")}
                      {e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{formatINR(e.amount)}</span>
                    <button
                      onClick={() => deleteExpense(e.id)}
                      className="btn-animated rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, delay = 0 }: { label: string; value: string; accent?: boolean; delay?: number }) {
  return (
    <div
      className={`finova-card p-4 animate-float-up ${accent ? "gradient-card" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
