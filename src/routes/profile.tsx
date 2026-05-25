import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  useSavingsGoals,
  useAuth,
  useTheme,
  useExpenses,
} from "@/hooks/use-finova-store";
import { formatINR } from "@/lib/format";
import { useNavigate } from "@tanstack/react-router";
import { Confetti } from "@/components/Confetti";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — FinNova" },
      { name: "description", content: "Manage goals, reports, and settings." },
    ],
  }),
});

function ProfilePage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useSavingsGoals();
  const { addExpense } = useExpenses();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const justHitRef = useRef<Set<string>>(new Set());

  const handleAdd = () => {
    const t = parseFloat(goalTarget);
    if (!goalName.trim() || !t || t <= 0) return;
    addGoal({ name: goalName.trim(), target: t, saved: 0 });
    setGoalName("");
    setGoalTarget("");
    setShowAdd(false);
  };

  const handleContribute = (
    goalId: string,
    goalNameStr: string,
    currentSaved: number,
    target: number,
    amount: number
  ) => {
    const room = Math.max(0, target - currentSaved);
    const applied = Math.min(amount, room);
    if (applied <= 0) return;
    const newSaved = currentSaved + applied;
    updateGoal(goalId, newSaved);
    // Auto-subtract from monthly budget by logging as a Savings expense
    addExpense({
      amount: applied,
      category: "Savings",
      date: new Date().toISOString().slice(0, 10),
      note: `Saved for ${goalNameStr}`,
    });
    // Confetti when goal hits 100% (only fire once per goal session)
    if (newSaved >= target && !justHitRef.current.has(goalId)) {
      justHitRef.current.add(goalId);
      setConfettiTrigger((n) => n + 1);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="px-4 pb-24 pt-6">
      <Confetti trigger={confettiTrigger} />

      {/* Header */}
      <div className="mb-6 flex items-center gap-4 animate-fade-in-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-primary-foreground shadow-glow animate-pulse-glow">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{user?.name || "User"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email || "Manage your finances"}</p>
          <p className="text-xs text-primary font-medium mt-0.5">FinNova Member</p>
        </div>
      </div>

      {/* Savings Goals */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Savings Goals</h2>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-animated text-xs font-semibold text-primary px-3 py-1 rounded-lg"
          >
            {showAdd ? "Cancel" : "+ Add Goal"}
          </button>
        </div>

        {showAdd && (
          <div className="finova-card p-4 mb-3 space-y-3 animate-fade-in-up">
            <input
              type="text"
              placeholder="Goal name (e.g., Vacation)"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              maxLength={50}
              className="w-full rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 transition-colors"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">₹</span>
              <input
                type="number"
                placeholder="Target amount"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                className="flex-1 rounded-lg bg-muted px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 transition-colors"
              />
            </div>
            <button onClick={handleAdd} className="btn-animated w-full rounded-xl gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Create Goal
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Money saved for goals is auto-deducted from your monthly budget.
            </p>
          </div>
        )}

        {goals.length === 0 && !showAdd ? (
          <EmptyGoals onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const pct = g.target > 0 ? Math.min((g.saved / g.target) * 100, 100) : 0;
              const hit = g.saved >= g.target && g.target > 0;
              return (
                <div
                  key={g.id}
                  className={`finova-card p-4 transition-all ${
                    hit ? "ring-2 ring-primary/40 shadow-glow" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{g.name}</span>
                      {hit && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                          Achieved 🎉
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="btn-animated text-xs text-muted-foreground hover:text-destructive rounded-lg p-1">✕</button>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-base font-bold text-foreground">{formatINR(g.saved)}</span>
                    <span className="text-xs text-muted-foreground">/ {formatINR(g.target)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                    <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  {!hit && (
                    <div className="flex gap-2">
                      {[500, 1000, 5000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => handleContribute(g.id, g.name, g.saved, g.target, amt)}
                          className="btn-animated rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                        >
                          +₹{amt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings */}
      <h2 className="text-base font-semibold text-foreground mb-3">Settings</h2>
      <div className="finova-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
            <span className="text-sm font-medium text-foreground">Theme</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
              theme === "dark" ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow-card transition-transform duration-300 ${
                theme === "dark" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <SettingsRow icon="🔔" label="Notifications" value="Enabled" />
        <SettingsRow icon="💱" label="Currency" value="INR (₹)" />
        <SettingsRow icon="📱" label="Version" value="1.0.0" />
      </div>

      <button
        onClick={handleLogout}
        className="btn-animated mt-6 w-full rounded-xl border border-destructive/30 bg-destructive/5 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        Log Out
      </button>
    </div>
  );
}

function EmptyGoals({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="finova-card p-6 text-center overflow-hidden relative">
      <div className="ambient-orbs opacity-50" />
      <div className="relative">
        <svg
          viewBox="0 0 120 90"
          className="mx-auto mb-3 h-20 w-auto"
          aria-hidden
        >
          <defs>
            <linearGradient id="goalGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.55 0.22 265)" />
              <stop offset="100%" stopColor="oklch(0.65 0.2 320)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="50" r="28" fill="none" stroke="url(#goalGrad)" strokeWidth="3" opacity="0.35" />
          <circle cx="60" cy="50" r="20" fill="none" stroke="url(#goalGrad)" strokeWidth="3" opacity="0.6" />
          <circle cx="60" cy="50" r="10" fill="url(#goalGrad)" />
          <path d="M60 8 L60 22" stroke="url(#goalGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 8 L74 14 L64 18 Z" fill="url(#goalGrad)" />
        </svg>
        <p className="text-sm font-semibold text-foreground">Aim for something exciting</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          Create your first savings goal and track progress here.
        </p>
        <button
          onClick={onAdd}
          className="btn-animated rounded-xl gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
        >
          + Create a Goal
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
