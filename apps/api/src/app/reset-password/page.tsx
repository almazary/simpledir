"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function ResetInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"form" | "ok" | "error">(
    token ? "form" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "Missing reset token.",
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Reset failed");
        return;
      }
      setStatus("ok");
      setMessage(
        data.message ?? "Password updated. Open SimpleDir and sign in.",
      );
    } catch {
      setStatus("error");
      setMessage("Network error while resetting password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#0b0b0f",
        color: "#f5f5f7",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          border: "1px solid #2a2a33",
          borderRadius: 16,
          padding: 28,
          background: "#14141a",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 22 }}>SimpleDir</h1>
        <p style={{ color: "#8e8e98", marginTop: 0 }}>Reset password</p>

        {status === "ok" && (
          <p style={{ color: "#7ddea5" }}>{message}</p>
        )}
        {status === "error" && message && (
          <p style={{ color: "#ff8b8b" }}>{message}</p>
        )}

        {status === "form" && (
          <form onSubmit={(e) => void onSubmit(e)}>
            <label style={{ display: "block", marginBottom: 12, fontSize: 14 }}>
              New password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2a2a33",
                  background: "#0f0f14",
                  color: "#f5f5f7",
                }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
              Confirm password
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #2a2a33",
                  background: "#0f0f14",
                  color: "#f5f5f7",
                }}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #3b57a0",
                background: "#2a3f73",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {busy ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <ResetInner />
    </Suspense>
  );
}
