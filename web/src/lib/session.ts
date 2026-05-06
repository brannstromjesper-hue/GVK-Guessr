import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "gvk_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const SESSION_SECRET_ENV_NAMES = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;

type SessionPayload = {
  sub: string;
  name: string;
  exp: number;
};

export type AppSession = {
  user: {
    id: string;
    name: string;
  };
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function getSessionSecret(): string | null {
  for (const name of SESSION_SECRET_ENV_NAMES) {
    const secret = process.env[name]?.trim();
    if (secret) return secret;
  }
  return null;
}

export function hasSessionSecret(): boolean {
  return getSessionSecret() !== null;
}

function getRequiredSessionSecret(): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required");
  }
  return secret;
}

function signPayload(payloadBase64: string): string {
  return createHmac("sha256", getRequiredSessionSecret())
    .update(payloadBase64)
    .digest("base64url");
}

export function createSessionToken(userId: string, userName: string): string {
  const payload: SessionPayload = {
    sub: userId,
    name: userName,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function parseSessionToken(token: string): AppSession | null {
  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = signPayload(payloadBase64);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadBase64)) as SessionPayload;
  } catch {
    return null;
  }

  if (!payload.sub || !payload.name || !payload.exp) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  return {
    user: {
      id: payload.sub,
      name: payload.name,
    },
  };
}

export async function getSessionFromCookies(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}
