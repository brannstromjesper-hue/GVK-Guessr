"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import AdminMembersPanel from "@/components/AdminMembersPanel";
import AdminGuessesPanel from "@/components/AdminGuessesPanel";
import { buildApiUrl } from "@/lib/api-url";

const AdminGuessesMap = dynamic(() => import("@/components/AdminGuessesMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Ladataan karttaa…
    </div>
  ),
});

type GuessRow = {
  id: string;
  memberName: string;
  lat: number;
  lng: number;
  score: number;
  distanceKm: number;
  updatedAt: string;
};

type MemberRow = {
  id: string;
  key: string;
  name: string;
  isAdmin: boolean;
};

export default function AdminPage() {
  const [session, setSession] = useState<{ user: { id: string; name: string } } | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [guesses, setGuesses] = useState<GuessRow[] | null>(null);
  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSessionAndAdminData() {
      setLoadError(null);
      try {
        const sessionRes = await fetch(buildApiUrl("/api/auth/session"));
        if (!sessionRes.ok) {
          setStatus("unauthenticated");
          return;
        }
        const sessionBody = (await sessionRes.json()) as { user: { id: string; name: string } };
        setSession(sessionBody);
        setStatus("authenticated");

        const [guessesRes, membersRes] = await Promise.all([
          fetch(buildApiUrl("/api/admin/guesses")),
          fetch(buildApiUrl("/api/admin/members")),
        ]);

        if (!guessesRes.ok || !membersRes.ok) {
          throw new Error("Ei käyttöoikeutta");
        }

        const guessesBody = (await guessesRes.json()) as { guesses?: GuessRow[] };
        const membersBody = (await membersRes.json()) as { members?: MemberRow[] };

        const localizedGuesses =
          guessesBody.guesses?.map((g) => ({
            ...g,
            updatedAt: new Date(g.updatedAt).toLocaleString("fi-FI"),
          })) ?? [];
        setGuesses(localizedGuesses);
        setMembers(membersBody.members ?? []);
      } catch (err) {
        setStatus("unauthenticated");
        setLoadError(err instanceof Error ? err.message : "Tietojen lataus epäonnistui.");
      }
    }

    void loadSessionAndAdminData();
  }, []);

  if (status === "loading" || (status === "authenticated" && (!guesses || !members) && !loadError)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Ladataan…</p>
      </main>
    );
  }

  if (status !== "authenticated" || loadError || !session?.user?.id || !guesses || !members) {
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

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Arvausten kartta
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Jokainen merkki näyttää yhden jäsenen arvaaman sijainnin.
          </p>
        </div>
        <AdminGuessesMap guesses={guesses} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Arvauslista
        </h2>
        <AdminGuessesPanel
          guesses={guesses}
          onGuessRemoved={(guessId) =>
            setGuesses((prev) => prev?.filter((guess) => guess.id !== guessId) ?? prev)
          }
        />
      </section>

      <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Jäsenlista
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Lisää tai poista jäseniä ja valitse kuka on ylläpitäjä.
        </p>
        <AdminMembersPanel
          initialMembers={members}
          currentAdminKey={session.user.id}
        />
      </section>
    </main>
  );
}
