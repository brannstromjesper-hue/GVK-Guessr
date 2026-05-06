import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import {
  getAppMemberFromUser,
  getMemberPassword,
  getMissingSupabaseAuthEnv,
  getSupabaseClients,
} from "@/lib/supabase-auth";
import type { AppMember } from "@/lib/supabase-auth";

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

function getAppSessionFromMember(member: AppMember | null): AppSession | null {
  if (!member) return null;
  return {
    user: {
      id: member.key,
      name: member.name,
      isAdmin: member.isAdmin,
    },
  };
}

export async function createMemberSession(member: AppMember): Promise<Session> {
  const { auth, admin } = getSupabaseClients();
  const password = getMemberPassword(member.key);
  const userMetadata = {
    app_member_key: member.key,
    name: member.name,
    is_admin: member.isAdmin,
  };

  if (!member.email) {
    throw new Error("Supabase member user is missing email");
  }

  // The app owns login, so keep the hidden Supabase password in sync with the member key.
  const updateResult = await admin.auth.admin.updateUserById(member.id, {
    password,
    user_metadata: userMetadata,
  });
  if (updateResult.error) throw updateResult.error;

  let result = await auth.auth.signInWithPassword({ email: member.email, password });
  if (result.error) {
    const { error } = await admin.auth.admin.updateUserById(member.id, {
      password,
      user_metadata: userMetadata,
    });
    if (error) throw error;

    result = await auth.auth.signInWithPassword({ email: member.email, password });
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
    const appSession = getAppSessionFromMember(getAppMemberFromUser(data.user));
    if (appSession) return appSession;
  }

  if (!refreshToken) return null;

  const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;

  setSessionCookiesFromTokens(cookieStore, data.session);
  return getAppSessionFromMember(getAppMemberFromUser(data.session.user));
}
