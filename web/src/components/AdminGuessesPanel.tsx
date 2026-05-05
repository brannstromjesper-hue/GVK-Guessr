"use client";

import { useState } from "react";
import { buildApiUrl } from "@/lib/api-url";

type GuessRow = {
  id: string;
  memberName: string;
  score: number;
  distanceKm: number;
  updatedAt: string;
};

type Props = {
  initialGuesses: GuessRow[];
};

export default function AdminGuessesPanel({ initialGuesses }: Props) {
  const [guesses, setGuesses] = useState(initialGuesses);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function removeGuess(guessId: string) {
    setBusyId(guessId);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/admin/guesses"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guessId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Arvauksen poistaminen epäonnistui.");
      setGuesses((prev) => prev.filter((g) => g.id !== guessId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jotain meni pieleen.");
    } finally {
      setBusyId(null);
    }
  }

  if (guesses.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-zinc-600 dark:text-zinc-400">
          Kukaan ei ole vielä lähettänyt arvausta.
        </p>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">#</th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Nimi</th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Pisteet</th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Etäisyys (km)
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Päivitetty
              </th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                Toiminto
              </th>
            </tr>
          </thead>
          <tbody>
            {guesses.map((g, i) => (
              <tr
                key={g.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
              >
                <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{g.memberName}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{g.score}</td>
                <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {Math.round(g.distanceKm * 100) / 100}
                </td>
                <td className="px-4 py-3 text-zinc-500">{g.updatedAt}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busyId === g.id}
                    onClick={() => void removeGuess(g.id)}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:opacity-40 dark:border-red-900 dark:text-red-300"
                  >
                    {busyId === g.id ? "Poistetaan…" : "Poista arvaus"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Kun arvaus poistetaan, henkilö voi lähettää uuden arvauksen.
      </p>
    </div>
  );
}
