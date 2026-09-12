"use client";

import { useEffect, useState, type FormEvent } from "react";
import { RequireAuth } from "@/components/web/RequireAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CredentialSummary } from "@simpledir/shared";
import { useAuth } from "@/lib/web-auth";
import { api } from "@/lib/web-api";

const emptyForm = {
  label: "",
  accountId: "",
  bucket: "",
  endpoint: "",
  accessKeyId: "",
  secretAccessKey: "",
};

function CredentialsHome() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CredentialSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [testedOk, setTestedOk] = useState(false);

  async function load() {
    try {
      const res = await api.listCredentials();
      setItems(res.credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function onFormChange<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTestedOk(false);
    setInfo(null);
  }

  function connectionPayload() {
    return {
      accountId: form.accountId.trim(),
      bucket: form.bucket.trim(),
      endpoint: form.endpoint.trim() || undefined,
      accessKeyId: form.accessKeyId.trim(),
      secretAccessKey: form.secretAccessKey.trim(),
    };
  }

  function closeForm() {
    setShowForm(false);
    setForm(emptyForm);
    setTestedOk(false);
  }

  async function onTest() {
    setBusy("test");
    setError(null);
    setInfo(null);
    setTestedOk(false);
    try {
      const res = await api.testCredential(connectionPayload());
      setTestedOk(true);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setBusy(null);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    setInfo(null);
    try {
      const test = await api.testCredential(connectionPayload());
      setInfo(test.message);
      setTestedOk(true);

      const created = await api.createCredential({
        label: form.label.trim(),
        ...connectionPayload(),
      });

      closeForm();
      setInfo(
        created.swapped
          ? "Saved (Access Key/Secret were swapped automatically)."
          : "Credential saved.",
      );
      await load();
    } catch (err) {
      setTestedOk(false);
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>R2 Credentials</h1>
          <p className="muted">
            {user?.name ? `${user.name} · ` : ""}
            {user?.email}
          </p>
        </div>
        <div className="row">
          <Link className="button ghost" href="/app/profile">
            Profile
          </Link>
          <button
            className="ghost"
            onClick={() => void logout().then(() => router.replace("/app/login"))}
          >
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {info && <div className="banner ok">{info}</div>}

      <div className="toolbar">
        {showForm ? (
          <button
            className="ghost"
            onClick={() => {
              closeForm();
              setError(null);
              setInfo(null);
            }}
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => {
              setShowForm(true);
              setError(null);
              setInfo(null);
              setTestedOk(false);
              setForm(emptyForm);
            }}
          >
            Add credential
          </button>
        )}
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={(e) => void onCreate(e)}>
          <h2
            style={{
              gridColumn: "1 / -1",
              margin: "0 0 0.25rem",
              fontSize: "1.1rem",
            }}
          >
            Add credential
          </h2>
          <label>
            Label
            <input
              required
              value={form.label}
              onChange={(e) => onFormChange("label", e.target.value)}
              placeholder="pribadi"
            />
          </label>
          <label>
            Cloudflare Account ID
            <input
              required
              value={form.accountId}
              onChange={(e) => onFormChange("accountId", e.target.value)}
            />
          </label>
          <label>
            Bucket
            <input
              required
              value={form.bucket}
              onChange={(e) => onFormChange("bucket", e.target.value)}
            />
          </label>
          <label>
            Endpoint (optional)
            <input
              value={form.endpoint}
              onChange={(e) => onFormChange("endpoint", e.target.value)}
              placeholder="https://&lt;accountid&gt;.r2.cloudflarestorage.com"
            />
          </label>
          <label>
            Access Key ID (32 chars)
            <input
              required
              value={form.accessKeyId}
              onChange={(e) => onFormChange("accessKeyId", e.target.value)}
            />
          </label>
          <label>
            Secret Access Key (64 chars)
            <input
              required
              type="password"
              value={form.secretAccessKey}
              onChange={(e) => onFormChange("secretAccessKey", e.target.value)}
            />
          </label>
          <div className="row" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <button
              type="button"
              className="ghost"
              disabled={busy !== null}
              onClick={() => void onTest()}
            >
              {busy === "test" ? "Testing…" : "Test connection"}
            </button>
            <button type="submit" disabled={busy !== null || !testedOk}>
              {busy === "save"
                ? "Saving…"
                : testedOk
                  ? "Save credential"
                  : "Test connection first"}
            </button>
          </div>
          <p className="muted" style={{ gridColumn: "1 / -1", margin: 0 }}>
            Save stays disabled until a connection test succeeds.
          </p>
        </form>
      )}

      <div className="cred-grid">
        {items.length === 0 && !showForm && (
          <div className="empty">No credentials yet. Add your first R2 label.</div>
        )}
        {items.map((c) => (
          <Link key={c.id} className="cred-card cred-card-link" href={`/app/browse/${c.id}`}>
            <div>
              <h3>{c.label}</h3>
              <p className="muted">{c.bucket}</p>
              <p className="tiny">{c.endpoint}</p>
            </div>
            <p className="muted open-hint">Open →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}


export default function CredentialsPage() {
  return (
    <RequireAuth>
      <CredentialsHome />
    </RequireAuth>
  );
}
