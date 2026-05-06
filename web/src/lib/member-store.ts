import {
  getSupabaseClients,
  type AppMember,
  type SupabaseMemberRow,
} from "@/lib/supabase-auth";

export function memberKey(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function rowToMember(row: SupabaseMemberRow): AppMember {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isAdmin: row.is_admin,
  };
}

export async function listMembers(): Promise<AppMember[]> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("members")
    .select("id,key,name,is_admin,created_at,updated_at")
    .order("is_admin", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SupabaseMemberRow[]).map(rowToMember);
}

export async function findMemberByKey(key: string): Promise<AppMember | null> {
  if (!key) return null;
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("members")
    .select("id,key,name,is_admin,created_at,updated_at")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMember(data as SupabaseMemberRow) : null;
}

export async function createMember(name: string): Promise<AppMember> {
  const { admin } = getSupabaseClients();
  const key = memberKey(name);
  const existing = await findMemberByKey(key);
  if (existing) {
    throw new Error("MEMBER_EXISTS");
  }

  const { data, error } = await admin
    .from("members")
    .insert({ key, name, is_admin: false })
    .select("id,key,name,is_admin,created_at,updated_at")
    .single();
  if (error) throw error;
  return rowToMember(data as SupabaseMemberRow);
}

export async function updateMemberAdmin(key: string, isAdmin: boolean): Promise<AppMember | null> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("members")
    .update({ is_admin: isAdmin })
    .eq("key", key)
    .select("id,key,name,is_admin,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMember(data as SupabaseMemberRow) : null;
}

export async function deleteMemberByKey(key: string): Promise<AppMember | null> {
  const { admin } = getSupabaseClients();
  const { data, error } = await admin
    .from("members")
    .delete()
    .eq("key", key)
    .select("id,key,name,is_admin,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMember(data as SupabaseMemberRow) : null;
}

export async function isAdminMemberByKey(key: string): Promise<boolean> {
  return !!(await findMemberByKey(key))?.isAdmin;
}

export async function countAdminMembers(): Promise<number> {
  const { admin } = getSupabaseClients();
  const { count, error } = await admin
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("is_admin", true);
  if (error) throw error;
  return count ?? 0;
}
