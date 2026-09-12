import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiBaseUrl, isDevBuild, setApiBaseUrl } from "../lib/config";

export function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (showApiSettings) {
      setApiBaseUrl(apiUrl);
    }
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
      <form className="card" onSubmit={onSubmit}>
        <h1>Create account</h1>
        <p className="muted">Verify your email before signing in</p>
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
        <label>
          Password (min 8)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          {busy ? "Creating…" : "Register"}
        </button>
        <p className="muted center">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
