import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const nameChanged = name.trim() !== (user?.name ?? "");
    if (!nameChanged && !newPassword) {
      setError("Nothing to update");
      return;
    }

    setBusy(true);
    try {
      const message = await updateProfile({
        name: nameChanged ? name.trim() : undefined,
        currentPassword: newPassword ? currentPassword : undefined,
        newPassword: newPassword || undefined,
      });
      setInfo(message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <Link to="/" className="muted">
            ← Credentials
          </Link>
          <h1>Profile</h1>
          <p className="muted">{user?.email}</p>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {info && <div className="banner ok">{info}</div>}

      <form className="card form-grid" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Username / display name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label>
          Email
          <input value={user?.email ?? ""} disabled />
        </label>
        <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
            Change password
          </h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Leave blank to keep your current password.
          </p>
        </div>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" disabled={busy} style={{ gridColumn: "1 / -1" }}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
