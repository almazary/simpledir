import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type R2Entry } from "../lib/api";
import { formatSize } from "../lib/format";
import { confirmAction, saveBytesToDisk } from "../lib/saveFile";
import { isTauri, pathsToFiles } from "../lib/tauriDrop";

type DeepStats = {
  objectCount: number;
  totalBytes: number;
  truncated: boolean;
};

type CredForm = {
  label: string;
  accountId: string;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function BrowserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [label, setLabel] = useState<string>("");
  const [bucket, setBucket] = useState<string>("");
  const [prefix, setPrefix] = useState("");
  const [entries, setEntries] = useState<R2Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [deepStats, setDeepStats] = useState<DeepStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<R2Entry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [credForm, setCredForm] = useState<CredForm | null>(null);
  const [credBusy, setCredBusy] = useState<"load" | "test" | "save" | null>(null);
  const [credTestedOk, setCredTestedOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const prefixRef = useRef(prefix);
  const idRef = useRef(id);
  const uploadingLock = useRef(false);
  const listRequestId = useRef(0);
  const statsRequestId = useRef(0);
  const searchRequestId = useRef(0);

  useEffect(() => {
    prefixRef.current = prefix;
  }, [prefix]);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  const crumbs = useMemo(() => {
    const parts = prefix.split("/").filter(Boolean);
    const items: { label: string; path: string }[] = [
      { label: "root", path: "" },
    ];
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      items.push({ label: part, path: acc });
    }
    return items;
  }, [prefix]);

  const visibleEntries = searchResults ?? entries;
  const isSearchMode = searchResults !== null;

  const listingStats = useMemo(() => {
    let files = 0;
    let folders = 0;
    let bytes = 0;
    for (const entry of visibleEntries) {
      if (entry.type === "folder") {
        folders += 1;
      } else {
        files += 1;
        bytes += entry.size ?? 0;
      }
    }
    return { files, folders, bytes };
  }, [visibleEntries]);

  function clearSearch() {
    searchRequestId.current += 1;
    setSearchInput("");
    setSearchQuery("");
    setSearchResults(null);
    setSearching(false);
    setSearchTruncated(false);
  }

  async function runSearch(query: string) {
    if (!id) return;
    const q = query.trim();
    if (!q) {
      clearSearch();
      return;
    }
    const reqId = ++searchRequestId.current;
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchObjects(id, prefix, q);
      if (reqId !== searchRequestId.current) return;
      setSearchQuery(q);
      setSearchResults(res.entries);
      setSearchTruncated(res.truncated);
    } catch (err) {
      if (reqId !== searchRequestId.current) return;
      setSearchResults([]);
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      if (reqId === searchRequestId.current) {
        setSearching(false);
      }
    }
  }

  const refresh = useCallback(
    async (
      credentialId: string,
      p: string,
      opts?: { soft?: boolean },
    ) => {
      const soft = opts?.soft === true;
      const reqId = ++listRequestId.current;
      setError(null);
      // Invalidate any in-flight / previous deep stats when the view changes
      statsRequestId.current += 1;
      setDeepStats(null);
      setStatsLoading(false);
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setEntries([]);
      }
      try {
        const res = await api.listObjects(credentialId, p);
        if (reqId !== listRequestId.current) return;
        setEntries(res.entries);
        setBucket(res.bucket);
      } catch (err) {
        if (reqId !== listRequestId.current) return;
        setError(err instanceof Error ? err.message : "Failed to list objects");
      } finally {
        if (reqId === listRequestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  async function onCalculateTotal() {
    if (!id || statsLoading) return;
    const reqId = ++statsRequestId.current;
    const p = prefix;
    setStatsLoading(true);
    setError(null);
    try {
      const res = await api.prefixStats(id, p);
      if (reqId !== statsRequestId.current) return;
      setDeepStats(res.stats);
    } catch (err) {
      if (reqId !== statsRequestId.current) return;
      setDeepStats(null);
      setError(err instanceof Error ? err.message : "Failed to calculate size");
    } finally {
      if (reqId === statsRequestId.current) {
        setStatsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const meta = await api.getCredential(id);
        if (cancelled) return;
        setLabel(meta.credential.label);
        setBucket(meta.credential.bucket);
        await refresh(id, "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load credential",
          );
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refresh]);

  async function goTo(path: string) {
    if (!id) return;
    clearSearch();
    setPrefix(path);
    // Hard load when changing folders — previous listing would be wrong
    await refresh(id, path, { soft: false });
  }

  async function openSearchResult(entry: R2Entry) {
    if (entry.type === "folder") {
      await goTo(entry.key.replace(/\/$/, ""));
      return;
    }
    // Jump to the parent folder of the matched file, then exit search
    const parts = entry.key.split("/").filter(Boolean);
    parts.pop();
    const parent = parts.join("/");
    await goTo(parent);
  }

  async function handleFiles(files: FileList | File[]) {
    const credentialId = idRef.current;
    if (!credentialId || uploadingLock.current) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    uploadingLock.current = true;
    const currentPrefix = prefixRef.current;
    for (const file of list) {
      setUploading(file.name);
      setProgress(0);
      try {
        await api.uploadObject(credentialId, currentPrefix, file, setProgress);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : `Upload failed: ${file.name}`,
        );
        break;
      }
    }
    setUploading(null);
    uploadingLock.current = false;
    if (searchQuery) {
      await runSearch(searchQuery);
    } else {
      await refresh(credentialId, currentPrefix, { soft: true });
    }
  }

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { getCurrentWebview } = await import("@tauri-apps/api/webview");
      unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
        if (cancelled) return;
        const { type } = event.payload;
        if (type === "enter" || type === "over") {
          setDragOver(true);
          return;
        }
        if (type === "leave") {
          setDragOver(false);
          return;
        }
        if (type === "drop") {
          setDragOver(false);
          try {
            const files = await pathsToFiles(event.payload.paths);
            if (files.length === 0) {
              setError(
                "No files to upload (folders are skipped — drop files only).",
              );
              return;
            }
            await handleFiles(files);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to read dropped files",
            );
          }
        }
      });
    })().catch((err) => {
      console.error("Failed to register Tauri drag-drop", err);
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(entry: R2Entry) {
    if (!id) return;
    const ok = await confirmAction(`Delete “${entry.name}”?`);
    if (!ok) return;
    try {
      await api.deleteObject(id, entry.key);
      setInfo(`Deleted ${entry.name}`);
      if (searchQuery) {
        await runSearch(searchQuery);
      } else {
        await refresh(id, prefix, { soft: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onDownload(entry: R2Entry) {
    if (!id || entry.type !== "file") return;
    setError(null);
    setInfo(null);
    try {
      const { bytes } = await api.downloadObjectBytes(id, entry.key);
      const saved = await saveBytesToDisk(entry.name, bytes);
      if (saved) {
        setInfo(`Saved ${entry.name}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  }

  function openNewFolder() {
    setFolderName("");
    setShowNewFolder(true);
    setError(null);
    setTimeout(() => folderInputRef.current?.focus(), 0);
  }

  async function onCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const name = folderName.trim().replace(/\/+/g, "");
    if (!name) {
      setError("Folder name is required");
      return;
    }
    setFolderBusy(true);
    setError(null);
    try {
      await api.createFolder(id, prefix, name);
      setShowNewFolder(false);
      setFolderName("");
      setInfo(`Folder “${name}” created`);
      await refresh(id, prefix, { soft: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setFolderBusy(false);
    }
  }

  async function onRefresh() {
    if (!id) return;
    setInfo(null);
    await refresh(id, prefix, { soft: true });
  }

  function onCredFormChange<K extends keyof CredForm>(key: K, value: CredForm[K]) {
    setCredForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setCredTestedOk(false);
  }

  async function openEdit() {
    if (!id) return;
    setShowNewFolder(false);
    setShowEdit(true);
    setCredBusy("load");
    setCredTestedOk(false);
    setError(null);
    try {
      const res = await api.getCredential(id);
      const c = res.credential;
      setCredForm({
        label: c.label,
        accountId: c.accountId,
        bucket: c.bucket,
        endpoint: c.endpoint,
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      });
    } catch (err) {
      setShowEdit(false);
      setError(err instanceof Error ? err.message : "Failed to load credential");
    } finally {
      setCredBusy(null);
    }
  }

  async function onTestCredential() {
    if (!credForm) return;
    setCredBusy("test");
    setError(null);
    setInfo(null);
    setCredTestedOk(false);
    try {
      const res = await api.testCredential({
        accountId: credForm.accountId.trim(),
        bucket: credForm.bucket.trim(),
        endpoint: credForm.endpoint.trim() || undefined,
        accessKeyId: credForm.accessKeyId.trim(),
        secretAccessKey: credForm.secretAccessKey.trim(),
      });
      setCredTestedOk(true);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setCredBusy(null);
    }
  }

  async function onSaveCredential(e: FormEvent) {
    e.preventDefault();
    if (!id || !credForm) return;
    setCredBusy("save");
    setError(null);
    setInfo(null);
    try {
      const payload = {
        accountId: credForm.accountId.trim(),
        bucket: credForm.bucket.trim(),
        endpoint: credForm.endpoint.trim() || undefined,
        accessKeyId: credForm.accessKeyId.trim(),
        secretAccessKey: credForm.secretAccessKey.trim(),
      };
      await api.testCredential(payload);
      const updated = await api.updateCredential(id, {
        label: credForm.label.trim(),
        ...payload,
      });
      setLabel(updated.credential.label);
      setBucket(updated.credential.bucket);
      setShowEdit(false);
      setCredForm(null);
      setCredTestedOk(false);
      setInfo(
        updated.swapped
          ? "Credential updated (keys were swapped automatically)."
          : "Credential updated.",
      );
      await refresh(id, prefix, { soft: true });
    } catch (err) {
      setCredTestedOk(false);
      setError(err instanceof Error ? err.message : "Failed to update credential");
    } finally {
      setCredBusy(null);
    }
  }

  async function onDeleteCredential() {
    if (!id) return;
    const ok = await confirmAction(
      `Delete credential “${label || "this credential"}”? This does not delete files in R2.`,
    );
    if (!ok) return;
    try {
      await api.deleteCredential(id);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div
      className={`page browser ${dragOver ? "drag-over" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) {
          void handleFiles(e.dataTransfer.files);
        }
      }}
    >
      <header className="topbar">
        <div>
          <Link to="/" className="muted">
            ← Credentials
          </Link>
          <h1>{label || "Loading…"}</h1>
          <p className="muted">{bucket}</p>
        </div>
        <div className="row wrap">
          <button
            className="ghost"
            onClick={() => void onRefresh()}
            disabled={!id || loading || refreshing || !!uploading}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="ghost" onClick={openNewFolder} disabled={!id || showEdit}>
            New folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={!id || showEdit}>
            Upload
          </button>
          <button
            className="ghost"
            onClick={() => void openEdit()}
            disabled={!id || credBusy === "load"}
          >
            Edit
          </button>
          <button
            className="ghost danger"
            onClick={() => void onDeleteCredential()}
            disabled={!id}
          >
            Delete
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <nav className="crumbs">
        {crumbs.map((c, i) => (
          <button
            key={c.path || "root"}
            className="linkish"
            onClick={() => void goTo(c.path)}
          >
            {i > 0 && <span className="sep">/</span>}
            {c.label}
          </button>
        ))}
      </nav>

      {showEdit && (
        <form className="card form-grid" onSubmit={(e) => void onSaveCredential(e)}>
          <h2
            style={{
              gridColumn: "1 / -1",
              margin: "0 0 0.25rem",
              fontSize: "1.1rem",
            }}
          >
            {credBusy === "load" ? "Loading credential…" : "Edit credential"}
          </h2>
          <label>
            Label
            <input
              required
              disabled={!credForm || credBusy === "load"}
              value={credForm?.label ?? ""}
              onChange={(e) => onCredFormChange("label", e.target.value)}
            />
          </label>
          <label>
            Cloudflare Account ID
            <input
              required
              disabled={!credForm || credBusy === "load"}
              value={credForm?.accountId ?? ""}
              onChange={(e) => onCredFormChange("accountId", e.target.value)}
            />
          </label>
          <label>
            Bucket
            <input
              required
              disabled={!credForm || credBusy === "load"}
              value={credForm?.bucket ?? ""}
              onChange={(e) => onCredFormChange("bucket", e.target.value)}
            />
          </label>
          <label>
            Endpoint (optional)
            <input
              disabled={!credForm || credBusy === "load"}
              value={credForm?.endpoint ?? ""}
              onChange={(e) => onCredFormChange("endpoint", e.target.value)}
            />
          </label>
          <label>
            Access Key ID
            <input
              required
              disabled={!credForm || credBusy === "load"}
              value={credForm?.accessKeyId ?? ""}
              onChange={(e) => onCredFormChange("accessKeyId", e.target.value)}
            />
          </label>
          <label>
            Secret Access Key
            <input
              required
              type="password"
              disabled={!credForm || credBusy === "load"}
              value={credForm?.secretAccessKey ?? ""}
              onChange={(e) =>
                onCredFormChange("secretAccessKey", e.target.value)
              }
            />
          </label>
          <div className="row" style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <button
              type="button"
              className="ghost"
              disabled={credBusy !== null || !credForm}
              onClick={() => void onTestCredential()}
            >
              {credBusy === "test" ? "Testing…" : "Test connection"}
            </button>
            <button
              type="submit"
              disabled={credBusy !== null || !credForm || !credTestedOk}
            >
              {credBusy === "save"
                ? "Saving…"
                : credTestedOk
                  ? "Update credential"
                  : "Test connection first"}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={credBusy === "save"}
              onClick={() => {
                setShowEdit(false);
                setCredForm(null);
                setCredTestedOk(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showNewFolder && (
        <form className="inline-form" onSubmit={(e) => void onCreateFolder(e)}>
          <input
            ref={folderInputRef}
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            required
          />
          <button type="submit" disabled={folderBusy}>
            {folderBusy ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowNewFolder(false)}
            disabled={folderBusy}
          >
            Cancel
          </button>
        </form>
      )}

      {error && <div className="banner error">{error}</div>}
      {info && <div className="banner ok">{info}</div>}
      {uploading && (
        <div className="banner ok">
          Uploading {uploading}… {progress}%
        </div>
      )}

      <div className={`drop-hint ${dragOver ? "active" : ""}`}>
        {dragOver
          ? "Drop files to upload…"
          : "Drag files from Finder/Explorer here to upload"}
      </div>

      {!loading && (
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(searchInput);
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              prefix
                ? "Search in this folder…"
                : "Search in this bucket…"
            }
            disabled={searching || !!uploading}
          />
          {isSearchMode && (
            <button
              type="button"
              className="ghost"
              onClick={clearSearch}
              disabled={searching}
            >
              Clear
            </button>
          )}
          <button type="submit" disabled={searching || !searchInput.trim()}>
            {searching ? "Searching…" : "Search"}
          </button>
        </form>
      )}

      {isSearchMode && (
        <div className="search-meta muted">
          Results for “{searchQuery}”
          {searchTruncated ? " (showing partial matches)" : ""}
          {" · "}
          {searchResults.length} found
        </div>
      )}

      {!loading && (
        <div className="stats-bar">
          <div className="stats-metrics">
            <div className="stats-metric">
              <span className="stats-label">Files</span>
              <strong className="stats-value">{listingStats.files}</strong>
            </div>
            <div className="stats-metric">
              <span className="stats-label">Folders</span>
              <strong className="stats-value">{listingStats.folders}</strong>
            </div>
            <div className="stats-metric">
              <span className="stats-label">Visible size</span>
              <strong className="stats-value">
                {listingStats.files > 0 ? formatSize(listingStats.bytes) : "—"}
              </strong>
            </div>
            <div className="stats-metric stats-metric-wide">
              <span className="stats-label">
                {prefix ? "Folder total" : "Bucket total"}
              </span>
              <strong className="stats-value">
                {statsLoading
                  ? "…"
                  : deepStats
                    ? `${formatSize(deepStats.totalBytes)}${deepStats.truncated ? "+" : ""} · ${deepStats.objectCount} obj`
                    : "—"}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="ghost stats-action"
            disabled={statsLoading || !!uploading}
            onClick={() => void onCalculateTotal()}
          >
            {statsLoading
              ? "Calculating…"
              : deepStats
                ? "Recalculate"
                : "Calculate total"}
          </button>
        </div>
      )}

      {loading || searching ? (
        <div className="empty">{searching ? "Searching…" : "Loading…"}</div>
      ) : visibleEntries.length === 0 ? (
        <div className="empty">
          {isSearchMode ? "No matching files" : "This folder is empty"}
        </div>
      ) : (
        <div
          className={`file-table-wrap ${refreshing ? "is-refreshing" : ""}`}
        >
          {refreshing && <div className="refresh-pill">Updating…</div>}
          <table className="file-table">
            <thead>
              <tr>
                <th>{isSearchMode ? "Path" : "Name"}</th>
                <th>Size</th>
                <th>Modified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    {entry.type === "folder" ? (
                      <button
                        className="linkish"
                        onClick={() =>
                          void (isSearchMode
                            ? openSearchResult(entry)
                            : goTo(entry.key.replace(/\/$/, "")))
                        }
                      >
                        📁 {entry.name}
                      </button>
                    ) : isSearchMode ? (
                      <button
                        className="linkish"
                        onClick={() => void openSearchResult(entry)}
                        title="Open containing folder"
                      >
                        📄 {entry.name}
                      </button>
                    ) : (
                      <span>📄 {entry.name}</span>
                    )}
                  </td>
                  <td className="muted">
                    {entry.type === "file" ? formatSize(entry.size) : "—"}
                  </td>
                  <td className="muted">
                    {entry.lastModified
                      ? new Date(entry.lastModified).toLocaleString()
                      : "—"}
                  </td>
                  <td className="row end">
                    {entry.type === "file" && (
                      <button
                        className="ghost"
                        onClick={() => void onDownload(entry)}
                      >
                        Download
                      </button>
                    )}
                    <button
                      className="ghost danger"
                      onClick={() => void onDelete(entry)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
