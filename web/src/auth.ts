import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { ensureMembersSeeded, memberKey } from "@/lib/member-store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        name: { label: "Nimi", type: "text" },
      },
      async authorize(credentials) {
        const raw = credentials?.name;
        if (typeof raw !== "string") return null;
        const input = raw.trim();
        if (!input) return null;

        await ensureMembersSeeded();

        const key = memberKey(input);
        const member = await prisma.member.findUnique({
          where: { key },
          select: { key: true, name: true },
        });
        if (!member) return null;

        return { id: member.key, name: member.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.name = (token.name as string | undefined) ?? null;
      }
      return session;
    },
  },
});
