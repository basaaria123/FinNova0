import { useMemo, useState } from "react";
import { useExpenses } from "@/hooks/use-finova-store";
import { CATEGORIES } from "@/lib/types";
import { formatINR } from "@/lib/format";
import { format, parseISO } from "date-fns";

export function PreviousTransactions() {
  const { expenses, deleteExpense } = useExpenses();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [month, setMonth] = useState<string>("all"); // YYYY-MM
  const [date, setDate] = useState<string>(""); // YYYY-MM-DD

  // Build month options from expenses
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of expenses) set.add(e.date.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (month !== "all" && e.date.slice(0, 7) !== month) return false;
      if (date && e.date.slice(0, 10) !== date) return false;
      return true;
    });
  }, [expenses, category, month, date]);

  const insights = useMemo(() => {
    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;
    const byCat: Record<string, number> = {};
    for (const e of filtered) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const highest = filtered.reduce<typeof filtered[number] | null>(
      (m, e) => (!m || e.amount > m.amount ? e : m),
      null
    );
    return { total, count, avg, topCategory: top, highest, byCat };
  }, [filtered]);

  const reset = () => {
    setCategory("all");
    setMonth("all");
    setDate("");
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-animated w-full rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow flex items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <span>📜</span> Previous Expenses
        </span>
        <span className="text-xs opacity-80">
          {expenses.length} total {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="finova-card mt-3 p-4 space-y-4 animate-fade-in-up">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Filters
              </span>
              <button
                onClick={reset}
                className="btn-animated text-xs font-medium text-primary"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="all">All months</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {format(parseISO(m + "-01"), "MMM yyyy")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg bg-muted px-3 py-2 text-sm text-foreground outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Insights
            </p>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions match these filters.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Total" value={formatINR(insights.total)} />
                  <Stat label="Count" value={String(insights.count)} />
                  <Stat label="Avg" value={formatINR(Math.round(insights.avg))} />
                </div>
                {insights.topCategory && (
                  <p className="text-xs text-muted-foreground">
                    Top category:{" "}
                    <span className="font-semibold text-foreground">
                      {insights.topCategory[0]}
                    </span>{" "}
                    ({formatINR(insights.topCategory[1])})
                  </p>
                )}
                {insights.highest && (
                  <p className="text-xs text-muted-foreground">
                    Highest spend:{" "}
                    <span className="font-semibold text-foreground">
                      {formatINR(insights.highest.amount)}
                    </span>{" "}
                    on {format(parseISO(insights.highest.date), "dd MMM")} (
                    {insights.highest.category})
                  </p>
                )}
                {/* Category breakdown bars */}
                <div className="space-y-1.5 pt-1">
                  {Object.entries(insights.byCat)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cat, amt]) => {
                      const pct = (amt / insights.total) * 100;
                      const c = CATEGORIES.find((x) => x.name === cat);
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-foreground">
                              {c?.icon} {cat}
                            </span>
                            <span className="text-muted-foreground">
                              {formatINR(amt)} · {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full gradient-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Expense log */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Log ({filtered.length})
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nothing to show.
                </p>
              ) : (
                filtered.map((e) => {
                  const cat = CATEGORIES.find((c) => c.name === e.category);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-base">
                        {cat?.icon || "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {e.category}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(parseISO(e.date), "dd MMM yyyy")}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatINR(e.amount)}
                      </span>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="btn-animated text-xs text-muted-foreground hover:text-destructive p-1"
                        aria-label="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
