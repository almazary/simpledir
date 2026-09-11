"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "Verification failed");
          return;
        }
        setStatus("ok");
        setMessage(data.message ?? "Email verified. You can open SimpleDir and log in.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error while verifying.");
      });
  }, [token]);

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
        <p style={{ color: status === "error" ? "#ff8b8b" : "#cfcfd6" }}>
          {message}
        </p>
        {status === "ok" && (
          <p style={{ fontSize: 14, color: "#8e8e98" }}>
            You can close this tab and return to the desktop app.
          </p>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <VerifyInner />
    </Suspense>
  );
}
