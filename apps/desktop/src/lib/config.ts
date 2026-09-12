const PROD_API = "https://www.simpledir.my.id";
const DEV_API = "http://localhost:3001";

const DEFAULT_API = import.meta.env.DEV ? DEV_API : PROD_API;

/** Normalize apex domain to www — Vercel 308 redirect breaks POST/fetch. */
function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (
    trimmed === "https://simpledir.my.id" ||
    trimmed === "http://simpledir.my.id"
  ) {
    return PROD_API;
  }
  return trimmed;
}

export function getApiBaseUrl(): string {
  const stored = localStorage.getItem("simpledir.apiBaseUrl");
  const resolved = normalizeApiBaseUrl(stored ?? DEFAULT_API);
  if (stored && stored.replace(/\/$/, "") !== resolved) {
    localStorage.setItem("simpledir.apiBaseUrl", resolved);
  }
  return resolved;
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(
    "simpledir.apiBaseUrl",
    normalizeApiBaseUrl(url.replace(/\/$/, "")),
  );
}

export function isDevBuild(): boolean {
  return import.meta.env.DEV;
}
