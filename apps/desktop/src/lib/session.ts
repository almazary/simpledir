import type { UserPublic } from "@simpledir/shared";

const ACCESS = "simpledir.accessToken";
const REFRESH = "simpledir.refreshToken";
const USER = "simpledir.user";

export function saveSession(
  accessToken: string,
  refreshToken: string,
  user: UserPublic,
) {
  localStorage.setItem(ACCESS, accessToken);
  localStorage.setItem(REFRESH, refreshToken);
  localStorage.setItem(USER, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH);
}

export function getStoredUser(): UserPublic | null {
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserPublic;
  } catch {
    return null;
  }
}
