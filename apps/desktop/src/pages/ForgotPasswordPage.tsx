import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { getApiBaseUrl, isDevBuild, setApiBaseUrl } from "../lib/config";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showApiSettings = isDevBuild();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    if (showApiSettings) setApiBaseUrl(apiUrl);
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
        <p className="muted">
          We&apos;ll email you a link to reset your password.
        </p>
        {error && <div className="banner error">{error}</div>}
        {message && <div className="banner ok">{message}</div>}
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
        {showApiSettings && (
          <details>
            <summary>API settings</summary>
            <label>
              API base URL
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3001"
              />
            </label>
          </details>
        )}
        <button type="submit" disabled={busy || !!message}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <p className="muted center">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
