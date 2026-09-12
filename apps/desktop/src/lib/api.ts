import type {
  AuthTokens,
  CreateCredentialInput,
  CredentialSecrets,
  CredentialSummary,
  R2ConnectionTestResult,
  TestCredentialInput,
  UpdateCredentialInput,
  UpdateProfileInput,
  UserPublic,
} from "@simpledir/shared";
import { getApiBaseUrl } from "./config";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
} from "./session";

type ApiError = { error: string; code?: string; details?: unknown };

export type R2Entry = {
  key: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: string;
};

function friendlyNetworkError(err: unknown): Error {
  if (err instanceof TypeError) {
    const hint = import.meta.env.DEV
      ? "Is `pnpm dev:api` running, and is the API base URL correct?"
      : "Check your internet connection, or try again in a moment.";
    return new Error(`Cannot reach API. ${hint}`);
  }
  if (err instanceof Error) return err;
  return new Error("Unknown error");
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!headers.has("Content-Type") && init.body && !isForm) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch (err) {
    throw friendlyNetworkError(err);
  }

  if (auth && res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      try {
        res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
      } catch (err) {
        throw friendlyNetworkError(err);
      }
    }
  }

  if (res.headers.get("content-disposition")?.includes("attachment")) {
    return res as unknown as T;
  }

  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    (err as Error & { code?: string }).code = data.code;
    throw err;
  }
  return data;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const data = await request<AuthTokens & { user: UserPublic }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
    );
    saveSession(data.accessToken, data.refreshToken, data.user);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export const api = {
  register(email: string, password: string) {
    return request<{ user: UserPublic; message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return request<AuthTokens & { user: UserPublic }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  forgotPassword(email: string) {
    return request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  resetPassword(token: string, password: string) {
    return request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },
  updateProfile(input: UpdateProfileInput) {
    return request<{ user: UserPublic; message: string }>(
      "/api/me",
      { method: "PATCH", body: JSON.stringify(input) },
      true,
    );
  },
  logout() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return Promise.resolve();
    return request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).finally(clearSession);
  },
  me() {
    return request<{ user: UserPublic }>("/api/me", {}, true);
  },
  listCredentials() {
    return request<{ credentials: CredentialSummary[] }>(
      "/api/credentials",
      {},
      true,
    );
  },
  testCredential(input: TestCredentialInput) {
    return request<R2ConnectionTestResult>(
      "/api/credentials/test",
      { method: "POST", body: JSON.stringify(input) },
      true,
    );
  },
  createCredential(input: CreateCredentialInput) {
    return request<{ credential: CredentialSummary; swapped?: boolean }>(
      "/api/credentials",
      { method: "POST", body: JSON.stringify(input) },
      true,
    );
  },
  getCredential(id: string) {
    return request<{ credential: CredentialSecrets }>(
      `/api/credentials/${id}`,
      {},
      true,
    );
  },
  updateCredential(id: string, input: UpdateCredentialInput) {
    return request<{ credential: CredentialSummary; swapped?: boolean }>(
      `/api/credentials/${id}`,
      { method: "PATCH", body: JSON.stringify(input) },
      true,
    );
  },
  deleteCredential(id: string) {
    return request<{ ok: boolean }>(
      `/api/credentials/${id}`,
      { method: "DELETE" },
      true,
    );
  },
  listObjects(credentialId: string, prefix = "") {
    const q = new URLSearchParams({ prefix });
    return request<{ entries: R2Entry[]; prefix: string; bucket: string }>(
      `/api/credentials/${credentialId}/objects?${q}`,
      {},
      true,
    );
  },
  searchObjects(credentialId: string, prefix = "", search: string) {
    const q = new URLSearchParams({ prefix, search });
    return request<{
      entries: R2Entry[];
      prefix: string;
      bucket: string;
      search: string;
      truncated: boolean;
      scanned: number;
    }>(`/api/credentials/${credentialId}/objects?${q}`, {}, true);
  },
  prefixStats(credentialId: string, prefix = "") {
    const q = new URLSearchParams({ prefix, stats: "1" });
    return request<{
      stats: {
        objectCount: number;
        totalBytes: number;
        truncated: boolean;
      };
      prefix: string;
      bucket: string;
    }>(`/api/credentials/${credentialId}/objects?${q}`, {}, true);
  },
  deleteObject(credentialId: string, key: string) {
    return request<{ ok: boolean }>(
      `/api/credentials/${credentialId}/objects`,
      { method: "DELETE", body: JSON.stringify({ key }) },
      true,
    );
  },
  createFolder(credentialId: string, prefix: string, name: string) {
    return request<{ ok: boolean; key: string }>(
      `/api/credentials/${credentialId}/objects`,
      { method: "POST", body: JSON.stringify({ prefix, name }) },
      true,
    );
  },
  async uploadObject(
    credentialId: string,
    prefix: string,
    file: File,
    onProgress?: (pct: number) => void,
  ) {
    const form = new FormData();
    form.append("file", file);
    form.append("prefix", prefix);

    // XMLHttpRequest gives upload progress; fetch does not
    const token = getAccessToken();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${getApiBaseUrl()}/api/credentials/${credentialId}/objects`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        try {
          const data = JSON.parse(xhr.responseText) as ApiError;
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () =>
        reject(
          new Error(
            "Upload failed — cannot reach API. Is `pnpm dev:api` running?",
          ),
        );
      xhr.send(form);
    });
  },
  async downloadObjectBytes(credentialId: string, key: string): Promise<{
    bytes: Uint8Array;
    contentType: string;
  }> {
    const q = new URLSearchParams({ download: key });
    const token = getAccessToken();
    let res: Response;
    try {
      res = await fetch(
        `${getApiBaseUrl()}/api/credentials/${credentialId}/objects?${q}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
    } catch (err) {
      throw friendlyNetworkError(err);
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as ApiError;
      throw new Error(data.error || `Download failed (${res.status})`);
    }
    const buffer = await res.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      contentType: res.headers.get("content-type") || "application/octet-stream",
    };
  },
};

