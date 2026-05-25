import { useState, useCallback, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Expense, Budget, SavingsGoal } from "@/lib/types";

// ---- Auth Context (Supabase) ----

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (data) {
      const { data: { session } } = await supabase.auth.getSession();
      setUser({
        id: userId,
        name: data.name || "",
        email: session?.user?.email || "",
      });
    }
    setLoading(false);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    if (data.user) {
      await supabase.from("profiles").insert({ id: data.user.id, name });
    }
    return null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    return null;
  }, []);

  return (
    <AuthContext value={{ user, loading, login, signup, logout, resetPassword }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      loading: false,
      login: async () => "Auth not available",
      signup: async () => "Auth not available",
      logout: async () => {},
      resetPassword: async () => "Auth not available",
    };
  }
  return ctx;
}

// ---- Expense hooks (Supabase) ----

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    setLoading(true);
    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setExpenses(
            data.map((e) => ({
              id: e.id,
              amount: Number(e.amount),
              category: e.category,
              date: e.date,
              note: e.description || "",
            }))
          );
        }
        setLoading(false);
      });
  }, [user]);

  const addExpense = useCallback(
    async (e: Omit<Expense, "id">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          amount: e.amount,
          category: e.category,
          description: e.note || "",
          date: e.date,
        })
        .select()
        .single();
      if (!error && data) {
        setExpenses((prev) => [
          {
            id: data.id,
            amount: Number(data.amount),
            category: data.category,
            date: data.date,
            note: data.description || "",
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  return { expenses, addExpense, deleteExpense, loading };
}

// ---- Budget hooks (Supabase) ----

export function useBudget() {
  const { user } = useAuth();
  const [budget, setBudgetState] = useState<Budget>({ monthly: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setBudgetState({ monthly: 0 });
      return;
    }

    setLoading(true);
    supabase
      .from("budgets")
      .select("monthly")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          setBudgetState({ monthly: Number(data.monthly) });
        }
        setLoading(false);
      });
  }, [user]);

  const setBudget = useCallback(
    async (monthly: number) => {
      if (!user) return;
      const { error } = await supabase.from("budgets").upsert(
        { user_id: user.id, monthly },
        { onConflict: "user_id" }
      );
      if (!error) {
        setBudgetState({ monthly });
      }
    },
    [user]
  );

  return { budget, setBudget, loading };
}

// ---- Savings Goals (localStorage fallback) ----

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function userKey(base: string, email: string | undefined) {
  return email ? `finova_${base}_${email}` : `finova_${base}`;
}

export function useSavingsGoals() {
  const { user } = useAuth();
  const key = userKey("goals", user?.email);

  const [goals, setGoals] = useState<SavingsGoal[]>(() => loadJSON(key, []));
  const loadedKey = useRef(key);

  useEffect(() => {
    setGoals(loadJSON(key, []));
    loadedKey.current = key;
  }, [key]);

  useEffect(() => {
    if (loadedKey.current !== key) return;
    saveJSON(key, goals);
  }, [key, goals]);

  const addGoal = useCallback((g: Omit<SavingsGoal, "id">) => {
    setGoals((prev) => [...prev, { ...g, id: crypto.randomUUID() }]);
  }, []);

  const updateGoal = useCallback((id: string, saved: number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved } : g)));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  return { goals, addGoal, updateGoal, deleteGoal };
}

export function useOnboarding() {
  const [seen, setSeen] = useState(() => loadJSON("finova_onboarded", false));

  const complete = useCallback(() => {
    setSeen(true);
    saveJSON("finova_onboarded", true);
  }, []);

  return { seen, complete };
}

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("finova_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("finova_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggleTheme };
}
