import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10).max(512),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(2048),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).max(2048),
});

const endpointField = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const r2ConnectionSchema = z.object({
  accountId: z.string().trim().min(1).max(128),
  bucket: z.string().trim().min(1).max(128),
  endpoint: endpointField,
  accessKeyId: z.string().trim().min(1).max(256),
  secretAccessKey: z.string().trim().min(1).max(256),
});

export const createCredentialSchema = r2ConnectionSchema.extend({
  label: z.string().trim().min(1).max(64),
});

export const testCredentialSchema = r2ConnectionSchema;

export const updateCredentialSchema = z
  .object({
    label: z.string().trim().min(1).max(64).optional(),
    accountId: z.string().trim().min(1).max(128).optional(),
    bucket: z.string().trim().min(1).max(128).optional(),
    endpoint: z
      .string()
      .trim()
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    accessKeyId: z.string().trim().min(1).max(256).optional(),
    secretAccessKey: z.string().trim().min(1).max(256).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>;
export type TestCredentialInput = z.infer<typeof testCredentialSchema>;

export type R2ConnectionTestResult = {
  ok: true;
  endpoint: string;
  swapped: boolean;
  corsApplied: boolean;
  corsError?: string;
  objectCount: number;
  message: string;
};

export type UserPublic = {
  id: string;
  email: string;
  status: "pending_verification" | "active" | "disabled";
  createdAt: string;
};

export type CredentialSummary = {
  id: string;
  label: string;
  accountId: string;
  bucket: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
};

export type CredentialSecrets = CredentialSummary & {
  accessKeyId: string;
  secretAccessKey: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};
