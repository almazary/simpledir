const DEFAULT_API = import.meta.env.DEV
  ? "http://localhost:3001"
  : "https://simpledir.my.id";

export function getApiBaseUrl(): string {
  return localStorage.getItem("simpledir.apiBaseUrl") ?? DEFAULT_API;
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem("simpledir.apiBaseUrl", url.replace(/\/$/, ""));
}
