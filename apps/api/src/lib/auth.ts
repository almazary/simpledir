import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import type { UserPublic } from "@simpledir/shared";
import { getDb } from "@/db";
import { refreshTokens, users, type User } from "@/db/schema";
import { hashToken, randomToken } from "./crypto";
import { getJwtSecret } from "./env";

const ACCESS_TTL_SEC = 60 * 15; // 15 minutes
const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

function jwtKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function signAccessToken(user: User): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const accessToken = await new SignJWT({
    sub: user.id,
    email: user.email,
    status: user.status,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(jwtKey());

  return { accessToken, expiresIn: ACCESS_TTL_SEC };
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const db = getDb();
  const token = randomToken(48);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(oldToken: string): Promise<{
  user: User;
  refreshToken: string;
} | null> {
  const db = getDb();
  const tokenHash = hashToken(oldToken);
  const rows = await db
    .select()
    .from(refreshTokens)
    .where(
      and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)),
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return null;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, row.id));

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  const user = userRows[0];
  if (!user || user.status === "disabled") {
    return null;
  }

  const refreshToken = await issueRefreshToken(user.id);
  return { user, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const db = getDb();
  const tokenHash = hashToken(token);
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export type AuthPayload = {
  userId: string;
  email: string;
  status: User["status"];
};

export async function verifyAccessToken(
  token: string,
): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, jwtKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.status !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      email: payload.email,
      status: payload.status as User["status"],
    };
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim() || null;
}

export async function requireAuth(
  req: Request,
): Promise<{ auth: AuthPayload } | { error: string; status: number }> {
  const token = getBearerToken(req);
  if (!token) {
    return { error: "Unauthorized", status: 401 };
  }
  const auth = await verifyAccessToken(token);
  if (!auth) {
    return { error: "Invalid or expired token", status: 401 };
  }
  if (auth.status !== "active") {
    return { error: "Account is not active", status: 403 };
  }
  return { auth };
}

export function defaultR2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}
