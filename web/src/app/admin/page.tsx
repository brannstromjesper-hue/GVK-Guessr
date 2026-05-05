import { auth } from "@/auth";
import { requireAdminUserKey } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import AdminMembersPanel from "@/components/AdminMembersPanel";
import AdminGuessesPanel from "@/components/AdminGuessesPanel";

export default async function AdminPage() {
  const session = await auth();
  const userKey = await requireAdminUserKey();

  if (!session?.user?.id || !userKey) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ei käyttöoikeutta
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Tämä sivu on vain järjestäjille.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-zinc-500 underline"
        >
          Etusivulle
        </Link>
      </main>
    );
  }

  const guesses = await prisma.guess.findMany({
    orderBy: [{ score: "desc" }, { distanceKm: "asc" }],
  });
  const members = await prisma.member.findMany({
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Tulokset (vain ylläpito)
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Pisteitä ja etäisyyttä ei näytetä osallistujille.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Takaisin
        </Link>
      </header>

      <AdminGuessesPanel
        initialGuesses={guesses.map((g) => ({
          id: g.id,
          memberName: g.memberName,
          score: g.score,
          distanceKm: g.distanceKm,
          updatedAt: g.updatedAt.toLocaleString("fi-FI"),
        }))}
      />

      <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Jäsenlista
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Lisää tai poista jäseniä ja valitse kuka on ylläpitäjä.
        </p>
        <AdminMembersPanel
          initialMembers={members.map((m) => ({
            id: m.id,
            name: m.name,
            key: m.key,
            isAdmin: m.isAdmin,
          }))}
          currentAdminKey={userKey}
        />
      </section>
    </main>
  );
}
