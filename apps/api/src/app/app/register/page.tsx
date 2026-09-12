"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PublicOnly } from "@/components/web/RequireAuth";
import { useAuth } from "@/lib/web-auth";

function RegisterForm() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const msg = await register(email, password);
      setMessage(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <h1>Create account</h1>
        <p className="muted">Verify your email before signing in</p>
        {error && <div className="banner error">{error}</div>}
        {message && <div className="banner ok">{message}</div>}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Password (min 8)
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={busy || !!message}>{busy ? "Creating…" : "Register"}</button>
        <p className="muted center">Already have an account? <Link href="/app/login">Sign in</Link></p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <PublicOnly>
      <RegisterForm />
    </PublicOnly>
  );
}
