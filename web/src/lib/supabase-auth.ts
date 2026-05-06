import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

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

export type AppMember = {
  id: string;
  key: string;
  name: string;
  isAdmin: boolean;
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

export function getSupabaseClients(): SupabaseClients {
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

export function getMemberAuthEmail(memberKey: string): string {
  const encodedKey = Buffer.from(memberKey, "utf8").toString("base64url");
  return `member-${encodedKey}@${getAuthEmailDomain()}`;
}

export function getMemberPassword(memberKey: string): string {
  const env = getSupabaseEnv();
  return createHmac("sha256", env.SUPABASE_MEMBER_PASSWORD_SECRET)
    .update(memberKey)
    .digest("base64url");
}

export type SupabaseMemberRow = {
  id: string;
  key: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export function getMemberMetadataFromUser(
  user: User | null,
): Pick<AppMember, "key" | "name" | "isAdmin"> | null {
  const userMetadata = user?.user_metadata as Record<string, unknown> | undefined;
  const memberKey =
    typeof userMetadata?.app_member_key === "string" ? userMetadata.app_member_key : null;
  const memberName = typeof userMetadata?.name === "string" ? userMetadata.name : null;

  if (!memberKey || !memberName) {
    return null;
  }

  return {
    key: memberKey,
    name: memberName,
    isAdmin: userMetadata?.is_admin === true,
  };
}

export async function findSupabaseUserByMemberKey(memberKey: string): Promise<User | null> {
  const { admin } = getSupabaseClients();
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.user_metadata?.app_member_key === memberKey,
    );
    if (user) return user;
    if (data.users.length < perPage) return null;
  }

  return null;
}

export async function findSupabaseUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();
  const users = await listSupabaseAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;
}

export async function listSupabaseAuthUsers(): Promise<User[]> {
  const { admin } = getSupabaseClients();
  const users: User[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    users.push(...data.users);
    if (data.users.length < perPage) break;
  }

  return users;
}
