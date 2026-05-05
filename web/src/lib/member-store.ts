import prisma from "@/lib/prisma";

export function memberKey(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseDelimitedList(raw: string | undefined): string[] {
  const t = raw?.trim() ?? "";
  if (!t) return [];
  const parts = t.includes("|") ? t.split("|") : t.split(",");
  return parts.map((p) => p.trim()).filter(Boolean);
}

export async function ensureMembersSeeded(): Promise<void> {
  const members = parseDelimitedList(process.env.MEMBERS);
  if (members.length === 0) return;

  const adminKeys = new Set(
    parseDelimitedList(process.env.ADMIN_NAMES).map((n) => memberKey(n)),
  );

  const count = await prisma.member.count();
  if (count === 0) {
    await prisma.member.createMany({
      data: members.map((name) => ({
        key: memberKey(name),
        name,
        isAdmin: adminKeys.has(memberKey(name)),
      })),
    });
    return;
  }

  // DB already seeded: still add anyone new from MEMBERS (editing .env alone used to do nothing).
  for (const name of members) {
    const key = memberKey(name);
    await prisma.member.upsert({
      where: { key },
      create: { key, name, isAdmin: adminKeys.has(key) },
      update: {},
    });
  }
}

export async function isAdminMemberByKey(key: string): Promise<boolean> {
  if (!key) return false;
  const member = await prisma.member.findUnique({
    where: { key },
    select: { isAdmin: true },
  });
  return !!member?.isAdmin;
}
