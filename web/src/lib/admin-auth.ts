import { isAdminMemberByKey } from "@/lib/member-store";
import { getSessionFromCookies } from "@/lib/session";

export async function requireAdminUserKey(): Promise<string | null> {
  const session = await getSessionFromCookies();

  const userKey = session?.user?.id;
  if (!userKey) return null;

  const isAdmin = await isAdminMemberByKey(userKey);
  return isAdmin ? userKey : null;
}
