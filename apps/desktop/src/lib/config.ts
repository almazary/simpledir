const DEFAULT_API = "http://localhost:3001";

export function getApiBaseUrl(): string {
  return localStorage.getItem("simpledir.apiBaseUrl") ?? DEFAULT_API;
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem("simpledir.apiBaseUrl", url.replace(/\/$/, ""));
}
