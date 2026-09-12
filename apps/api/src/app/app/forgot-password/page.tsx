"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PublicOnly } from "@/components/web/RequireAuth";
import { api } from "@/lib/web-api";

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card" onSubmit={(e) => void onSubmit(e)}>
        <h1>Forgot password</h1>
        <p className="muted">We&apos;ll email you a link to reset your password.</p>
        {error && <div className="banner error">{error}</div>}
        {message && <div className="banner ok">{message}</div>}
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <button type="submit" disabled={busy || !!message}>{busy ? "Sending…" : "Send reset link"}</button>
        <p className="muted center"><Link href="/app/login">Back to sign in</Link></p>
      </form>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <PublicOnly>
      <ForgotForm />
    </PublicOnly>
  );
}
