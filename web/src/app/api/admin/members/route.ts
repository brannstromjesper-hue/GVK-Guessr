import { requireAdminUserKey } from "@/lib/admin-auth";
import { memberKey } from "@/lib/member-store";
import prisma from "@/lib/prisma";
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

  const members = await prisma.member.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const authResult = await requireAdminOrForbidden();
  if ("response" in authResult) return authResult.response;

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() ?? "";
  if (!name)
    return NextResponse.json({ error: "Nimi vaaditaan" }, { status: 400 });

  const key = memberKey(name);
  const existing = await prisma.member.findUnique({ where: { key } });
  if (existing)
    return NextResponse.json({ error: "Jäsen on jo olemassa" }, { status: 409 });

  const member = await prisma.member.create({
    data: { name, key, isAdmin: false },
  });
  return NextResponse.json({ member });
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
    const adminCount = await prisma.member.count({ where: { isAdmin: true } });
    const target = await prisma.member.findUnique({
      where: { key },
      select: { isAdmin: true },
    });
    if (target?.isAdmin && adminCount <= 1) {
      return NextResponse.json(
        { error: "Vähintään yksi ylläpitäjä pitää olla." },
        { status: 400 },
      );
    }
  }

  const member = await prisma.member.update({
    where: { key },
    data: { isAdmin: body.isAdmin },
  });
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

  const target = await prisma.member.findUnique({
    where: { key },
    select: { isAdmin: true },
  });
  if (!target)
    return NextResponse.json({ error: "Jäsentä ei löytynyt" }, { status: 404 });
  if (target.isAdmin) {
    const adminCount = await prisma.member.count({ where: { isAdmin: true } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Vähintään yksi ylläpitäjä pitää olla." },
        { status: 400 },
      );
    }
  }

  await prisma.member.delete({ where: { key } });
  return NextResponse.json({ ok: true });
}
