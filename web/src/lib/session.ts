import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { createClient, type Session, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "gvk_sb_access";
const REFRESH_TOKEN_COOKIE = "gvk_sb_refresh";
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const DEFAULT_AUTH_EMAIL_DOMAIN = "auth.gvk-guessr.local";

const REQUIRED_SUPABASE_ENV_NAMES = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_MEMBER_PASSWORD_SECRET",
] as const;

type RequiredSupabaseEnvName = (typeof REQUIRED_SUPABASE_ENV_NAMES)[number];

type SupabaseEnv = Record<RequiredSupabaseEnvName, string>;

type SupabaseClients = {
  auth: SupabaseClient;
  admin: SupabaseClient;
};

export type AppSession = {
  user: {
    id: string;
    name: string;
  };
};

let cachedClients: SupabaseClients | null = null;

export function getMissingSupabaseAuthEnv(): string[] {
  return REQUIRED_SUPABASE_ENV_NAMES.filter((name) => !process.env[name]?.trim());
}

function getSupabaseEnv(): SupabaseEnv {
  const missing = getMissingSupabaseAuthEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase auth environment variables: ${missing.join(", ")}`);
  }

  return {
    SUPABASE_URL: process.env.SUPABASE_URL!.trim(),
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!.trim(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    SUPABASE_MEMBER_PASSWORD_SECRET: process.env.SUPABASE_MEMBER_PASSWORD_SECRET!.trim(),
  };
}

function getSupabaseClients(): SupabaseClients {
  if (cachedClients) return cachedClients;

  const env = getSupabaseEnv();
  const authOptions = {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  };

  cachedClients = {
    auth: createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, authOptions),
    admin: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, authOptions),
  };
  return cachedClients;
}

function getAuthEmailDomain(): string {
  return process.env.SUPABASE_AUTH_EMAIL_DOMAIN?.trim() || DEFAULT_AUTH_EMAIL_DOMAIN;
}

function getMemberAuthEmail(memberKey: string): string {
  const encodedKey = Buffer.from(memberKey, "utf8").toString("base64url");
  return `member-${encodedKey}@${getAuthEmailDomain()}`;
}

function getMemberPassword(memberKey: string): string {
  return createHmac("sha256", getSupabaseEnv().SUPABASE_MEMBER_PASSWORD_SECRET)
    .update(memberKey)
    .digest("base64url");
}

function getAppSessionFromUser(user: User | null): AppSession | null {
  const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  const memberKey = typeof userMetadata?.app_member_key === "string"
    ? userMetadata.app_member_key
    : null;
  const memberName = typeof userMetadata?.name === "string" ? userMetadata.name : null;

  if (!memberKey || !memberName) {
    return null;
  }

  return {
    user: {
      id: memberKey,
      name: memberName,
    },
  };
}

async function findSupabaseUserByEmail(email: string): Promise<User | null> {
  const { admin } = getSupabaseClients();
  const normalizedEmail = email.toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  return null;
}

async function ensureSupabaseMemberUser(memberKey: string, memberName: string): Promise<{
  email: string;
  password: string;
}> {
  const { admin } = getSupabaseClients();
  const email = getMemberAuthEmail(memberKey);
  const password = getMemberPassword(memberKey);
  const userMetadata = {
    app_member_key: memberKey,
    name: memberName,
  };

  const existingUser = await findSupabaseUserByEmail(email);
  if (!existingUser) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error && !error.message.toLowerCase().includes("already")) {
      throw error;
    }
  } else if (
    existingUser.user_metadata?.app_member_key !== memberKey ||
    existingUser.user_metadata?.name !== memberName
  ) {
    const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
      user_metadata: userMetadata,
    });
    if (error) throw error;
  }

  return { email, password };
}

export async function createMemberSession(memberKey: string, memberName: string): Promise<Session> {
  const { auth, admin } = getSupabaseClients();
  const { email, password } = await ensureSupabaseMemberUser(memberKey, memberName);

  let result = await auth.auth.signInWithPassword({ email, password });
  if (result.error) {
    const user = await findSupabaseUserByEmail(email);
    if (!user) throw result.error;

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: {
        app_member_key: memberKey,
        name: memberName,
      },
    });
    if (error) throw error;

    result = await auth.auth.signInWithPassword({ email, password });
  }

  if (result.error || !result.data.session) {
    throw result.error ?? new Error("Supabase did not return a session");
  }

  return result.data.session;
}

function setSessionCookiesFromTokens(
  cookieSetter: Pick<NextResponse["cookies"], "set">,
  session: Session,
): void {
  cookieSetter.set(ACCESS_TOKEN_COOKIE, session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: session.expires_in,
  });
  cookieSetter.set(REFRESH_TOKEN_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function setSessionCookies(res: NextResponse, session: Session): void {
  setSessionCookiesFromTokens(res.cookies, session);
}

export function clearSessionCookies(res: NextResponse): void {
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function getSessionFromCookies(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!accessToken && !refreshToken) return null;

  const { auth } = getSupabaseClients();
  if (accessToken) {
    const { data } = await auth.auth.getUser(accessToken);
    const appSession = getAppSessionFromUser(data.user);
    if (appSession) return appSession;
  }

  if (!refreshToken) return null;

  const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;

  setSessionCookiesFromTokens(cookieStore, data.session);
  return getAppSessionFromUser(data.session.user);
}
