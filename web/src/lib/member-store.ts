import type { User } from "@supabase/supabase-js";
import {
  findSupabaseUserByMemberKey,
  getAppMemberFromUser,
  getMemberAuthEmail,
  getMemberPassword,
  getSupabaseClients,
  type AppMember,
} from "@/lib/supabase-auth";

export function memberKey(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getRequiredMemberFromUser(user: User | null): AppMember {
  const member = getAppMemberFromUser(user);
  if (!member) {
    throw new Error("Supabase user is missing required member metadata");
  }
  return member;
}

export async function listMembers(): Promise<AppMember[]> {
  const { admin } = getSupabaseClients();
  const members: AppMember[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      const member = getAppMemberFromUser(user);
      if (member) members.push(member);
    }

    if (data.users.length < perPage) break;
  }

  return members.sort(sortMembers);
}

export async function findMemberByKey(key: string): Promise<AppMember | null> {
  if (!key) return null;
  return getAppMemberFromUser(await findSupabaseUserByMemberKey(key));
}

export async function createMember(name: string): Promise<AppMember> {
  const { admin } = getSupabaseClients();
  const key = memberKey(name);
  const existing = await findSupabaseUserByMemberKey(key);
  if (existing) {
    throw new Error("MEMBER_EXISTS");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: getMemberAuthEmail(key),
    password: getMemberPassword(key),
    email_confirm: true,
    user_metadata: {
      app_member_key: key,
      name,
      is_admin: false,
    },
  });
  if (error) throw error;
  return getRequiredMemberFromUser(data.user);
}

export async function updateMemberAdmin(key: string, isAdmin: boolean): Promise<AppMember | null> {
  const { admin } = getSupabaseClients();
  const user = await findSupabaseUserByMemberKey(key);
  const member = getAppMemberFromUser(user);
  if (!user || !member) return null;

  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      app_member_key: member.key,
      name: member.name,
      is_admin: isAdmin,
    },
  });
  if (error) throw error;
  return getRequiredMemberFromUser(data.user);
}

export async function deleteMemberByKey(key: string): Promise<AppMember | null> {
  const { admin } = getSupabaseClients();
  const user = await findSupabaseUserByMemberKey(key);
  const member = getAppMemberFromUser(user);
  if (!user || !member) return null;

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return member;
}

export async function isAdminMemberByKey(key: string): Promise<boolean> {
  return !!(await findMemberByKey(key))?.isAdmin;
}

export async function countAdminMembers(): Promise<number> {
  const members = await listMembers();
  return members.filter((member) => member.isAdmin).length;
}

function sortMembers(a: AppMember, b: AppMember): number {
  if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
  return a.name.localeCompare(b.name, "fi");
}
