import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-finova-store";
import finovaLogo from "@/assets/finova-logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "FinNova — Login" },
      { name: "description", content: "Sign in or create your FinNova account." },
    ],
  }),
});

function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { login, signup, resetPassword } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
    if (mode === "reset") {
      if (newPassword.length < 6) return "Password must be at least 6 characters";
      if (newPassword !== confirmNewPassword) return "Passwords do not match";
      return null;
    }
    if (password.length < 6) return "Password must be at least 6 characters";
    if (mode === "signup") {
      if (!name.trim()) return "Name is required";
      if (password !== confirmPassword) return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }

    if (mode === "login") {
      const res = await login(email, password);
      if (res) { setError(res); return; }
      navigate({ to: "/" });
    } else if (mode === "signup") {
      const res = await signup(name.trim(), email.trim(), password);
      if (res) { setError(res); return; }
      navigate({ to: "/" });
    } else {
      const res = await resetPassword(email.trim(), newPassword);
      if (res) { setError(res); return; }
      setSuccess("Password reset successfully! You can now login.");
      setTimeout(() => {
        setMode("login");
        setSuccess("");
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      }, 2000);
    }
  };

  const switchMode = (m: "login" | "signup" | "reset") => {
    setMode(m);
    setError("");
    setSuccess("");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 overflow-hidden">
      <div className="ambient-orbs" />
      <div className="w-full max-w-sm animate-fade-in-up relative z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl overflow-hidden animate-pulse-glow shadow-glow">
            <img src={finovaLogo} alt="FinNova logo" width={80} height={80} className="h-full w-full object-contain" />
          </div>
          <h1 className="font-brand text-2xl" style={{ color: 'var(--finova-metal-blue)' }}>
            <span style={{ opacity: 0.85 }}>Fin</span>Nova
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "reset" ? "Reset your password" : "Your smart expense companion"}
          </p>
        </div>

        {/* Toggle (login/signup only) */}
        {mode !== "reset" && (
          <div className="mb-6 flex rounded-xl bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
                mode === "login" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-300 ${
                mode === "signup" ? "bg-card shadow-card text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="animate-fade-in-up">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
              />
            </div>
          )}

          {mode === "signup" && (
            <div className="animate-fade-in-up">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
              />
            </div>
          )}

          {mode === "reset" && (
            <>
              <div className="animate-fade-in-up">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                />
              </div>
              <div className="animate-fade-in-up">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                />
              </div>
            </>
          )}

          {error && (
            <div className="animate-fade-in-up rounded-xl bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="animate-fade-in-up rounded-xl bg-success/10 px-4 py-2.5 text-xs font-medium text-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn-animated w-full rounded-xl gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            {mode === "login" ? "Login" : mode === "signup" ? "Create Account" : "Reset Password"}
          </button>
        </form>

        {/* Forgot password / Back to login */}
        <div className="mt-4 text-center">
          {mode === "login" && (
            <button
              onClick={() => switchMode("reset")}
              className="text-xs text-primary font-medium transition-colors hover:text-primary/80"
            >
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button
              onClick={() => switchMode("login")}
              className="text-xs text-primary font-medium transition-colors hover:text-primary/80"
            >
              ← Back to Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
