import { requireAdminUserKey } from "@/lib/admin-auth";
import {
  countAdminMembers,
  createMember,
  deleteMemberByKey,
  findMemberByKey,
  listMembers,
  memberKey,
  updateMemberAdmin,
} from "@/lib/member-store";
import { NextResponse } from "next/server";

function forbiddenResponse() {
  return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
}

async function requireAdminOrForbidden() {
  const userKey = await requireAdminUserKey();
  return userKey
    ? { userKey }
    : { response: forbiddenResponse() };
}

export async function GET() {
  const authResult = await requireAdminOrForbidden();
  if ("response" in authResult) return authResult.response;

  return NextResponse.json({ members: await listMembers() });
}

export async function POST(req: Request) {
  const authResult = await requireAdminOrForbidden();
  if ("response" in authResult) return authResult.response;

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() ?? "";
  if (!name)
    return NextResponse.json({ error: "Nimi vaaditaan" }, { status: 400 });

  const key = memberKey(name);
  const existing = await findMemberByKey(key);
  if (existing)
    return NextResponse.json({ error: "Jäsen on jo olemassa" }, { status: 409 });

  return NextResponse.json({ member: await createMember(name) });
}

export async function PATCH(req: Request) {
  const authResult = await requireAdminOrForbidden();
  if ("response" in authResult) return authResult.response;
  const { userKey } = authResult;

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    isAdmin?: boolean;
  };
  const key = body.key?.trim() ?? "";
  if (!key || typeof body.isAdmin !== "boolean") {
    return NextResponse.json({ error: "Virheellinen pyyntö" }, { status: 400 });
  }
  if (key === userKey) {
    return NextResponse.json(
      { error: "Et voi vaihtaa omaa ylläpito-rooliasi tästä." },
      { status: 400 },
    );
  }

  if (!body.isAdmin) {
    const adminCount = await countAdminMembers();
    const target = await findMemberByKey(key);
    if (target?.isAdmin && adminCount <= 1) {
      return NextResponse.json(
        { error: "Vähintään yksi ylläpitäjä pitää olla." },
        { status: 400 },
      );
    }
  }

  const member = await updateMemberAdmin(key, body.isAdmin);
  if (!member) {
    return NextResponse.json({ error: "Jäsentä ei löytynyt" }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function DELETE(req: Request) {
  const authResult = await requireAdminOrForbidden();
  if ("response" in authResult) return authResult.response;
  const { userKey } = authResult;

  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = body.key?.trim() ?? "";
  if (!key)
    return NextResponse.json({ error: "Tunniste vaaditaan" }, { status: 400 });
  if (key === userKey) {
    return NextResponse.json(
      { error: "Et voi poistaa itseäsi." },
      { status: 400 },
    );
  }

  const target = await findMemberByKey(key);
  if (!target)
    return NextResponse.json({ error: "Jäsentä ei löytynyt" }, { status: 404 });
  if (target.isAdmin) {
    const adminCount = await countAdminMembers();
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Vähintään yksi ylläpitäjä pitää olla." },
        { status: 400 },
      );
    }
  }

  await deleteMemberByKey(key);
  return NextResponse.json({ ok: true });
}
