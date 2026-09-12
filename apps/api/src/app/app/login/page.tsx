"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PublicOnly } from "@/components/web/RequireAuth";
import { useAuth } from "@/lib/web-auth";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <h1>SimpleDir</h1>
        <p className="muted">Sign in to manage your R2 buckets</p>
        {error && <div className="banner error">{error}</div>}
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted center">
          <Link href="/app/forgot-password">Forgot password?</Link>
        </p>
        <p className="muted center">
          No account? <Link href="/app/register">Register</Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <PublicOnly>
      <LoginForm />
    </PublicOnly>
  );
}
