import { auth } from "@/auth";
import { ensureMembersSeeded, isAdminMemberByKey } from "@/lib/member-store";

export async function requireAdminUserKey(): Promise<string | null> {
  const session = await auth();
  await ensureMembersSeeded();

  const userKey = session?.user?.id;
  if (!userKey) return null;

  const isAdmin = await isAdminMemberByKey(userKey);
  return isAdmin ? userKey : null;
}
