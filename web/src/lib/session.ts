import { cookies } from "next/headers";
import type { Session, User } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import {
  findSupabaseUserByEmail,
  findSupabaseUserByMemberKey,
  getMemberAuthEmail,
  getMemberMetadataFromUser,
  getMemberPassword,
  getMissingSupabaseAuthEnv,
  getSupabaseClients,
} from "@/lib/supabase-auth";
import type { AppMember } from "@/lib/supabase-auth";
import { findMemberByKey } from "@/lib/member-store";

export type AppSession = {
  user: {
    id: string;
    name: string;
    isAdmin: boolean;
  };
};

const ACCESS_TOKEN_COOKIE = "gvk_sb_access";
const REFRESH_TOKEN_COOKIE = "gvk_sb_refresh";
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export { getMissingSupabaseAuthEnv };

function getAppSessionFromMember(member: AppMember): AppSession {
  return {
    user: {
      id: member.key,
      name: member.name,
      isAdmin: member.isAdmin,
    },
  };
}

async function getCurrentMemberFromUserToken(
  user: User | null,
): Promise<AppMember | null> {
  const metadata = getMemberMetadataFromUser(user);
  if (!metadata) return null;
  return findMemberByKey(metadata.key);
}

async function ensureSupabaseAuthUserForMember(member: AppMember): Promise<{
  email: string;
  password: string;
}> {
  const { admin } = getSupabaseClients();
  const email = getMemberAuthEmail(member.key);
  const password = getMemberPassword(member.key);
  const userMetadata = {
    app_member_key: member.key,
    name: member.name,
    is_admin: member.isAdmin,
  };
  const existingUser =
    (await findSupabaseUserByMemberKey(member.key)) ?? (await findSupabaseUserByEmail(email));

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
    return { email, password };
  }

  const loginEmail = existingUser.email ?? email;
  const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
    password,
    user_metadata: userMetadata,
  });
  if (error) throw error;

  return { email: loginEmail, password };
}

export async function createMemberSession(member: AppMember): Promise<Session> {
  const { auth } = getSupabaseClients();
  const { email, password } = await ensureSupabaseAuthUserForMember(member);

  let result = await auth.auth.signInWithPassword({ email, password });
  if (result.error) {
    const retryCredentials = await ensureSupabaseAuthUserForMember(member);
    result = await auth.auth.signInWithPassword(retryCredentials);
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
    const member = await getCurrentMemberFromUserToken(data.user);
    if (member) return getAppSessionFromMember(member);
  }

  if (!refreshToken) return null;

  const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;

  setSessionCookiesFromTokens(cookieStore, data.session);
  const member = await getCurrentMemberFromUserToken(data.session.user);
  return member ? getAppSessionFromMember(member) : null;
}
