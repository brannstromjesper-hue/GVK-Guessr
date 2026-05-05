"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { buildApiUrl } from "@/lib/api-url";

const GuessMap = dynamic(() => import("@/components/GuessMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Ladataan karttaa…
    </div>
  ),
});

const successMessage =
  "Jaha! He va näära ööga saa Bellman tå han sköit älge i röve. Tror du pårittit att vi sku faa tidii? Nå tack nu entå att du svara, vi får sii om några viko tå om du djissa reet.";
const genericErrorMessage = "Jotain meni pieleen.";
type GuessStatusResponse = {
  hasGuess: boolean;
  lat: number | null;
  lng: number | null;
};
type SessionResponse = {
  user: {
    id: string;
    name: string;
  };
};

export default function GuessPage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [hasGuess, setHasGuess] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const markGuessSubmitted = useCallback(() => {
    setShowSuccess(true);
    setHasGuess(true);
  }, []);

  const applyExistingGuess = useCallback((data: GuessStatusResponse) => {
    setHasGuess(data.hasGuess);
    if (!data.hasGuess) return;

    setShowSuccess(true);
    if (data.lat != null && data.lng != null) {
      setLat(data.lat);
      setLng(data.lng);
    }
  }, []);

  useEffect(() => {
    async function loadSession() {
      const res = await fetch(buildApiUrl("/api/auth/session"));
      if (!res.ok) {
        setStatus("unauthenticated");
        return;
      }
      const data = (await res.json()) as SessionResponse;
      setSession(data);
      setStatus("authenticated");
    }
    void loadSession();
  }, []);

  const loadStatus = useCallback(async () => {
    const res = await fetch(buildApiUrl("/api/guess/status"));
    if (!res.ok) return;
    const data = (await res.json()) as GuessStatusResponse;
    applyExistingGuess(data);
  }, [applyExistingGuess]);

  async function handleLogout() {
    await fetch(buildApiUrl("/api/auth/logout"), { method: "POST" });
    window.location.href = "/";
  }

  useEffect(() => {
    if (status === "authenticated") void loadStatus();
  }, [status, loadStatus]);

  const onPositionChange = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    setError(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lat == null || lng == null) {
      setError("Napsauta karttaa asettaaksesi neulan.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/guess"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 409) {
          markGuessSubmitted();
          void loadStatus();
          return;
        }
        throw new Error(body.error ?? genericErrorMessage);
      }
      markGuessSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : genericErrorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || hasGuess === null) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
        <p className="text-zinc-500">Ladataan…</p>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
        <p className="text-zinc-500">Kirjaudu sisään jatkaaksesi.</p>
      </main>
    );
  }

  const locked = hasGuess === true;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <span className="block">GVK Åårsmööte - Djiss vann vi e på väg.</span>
            <span className="mt-1 block">GVK Vuosikokous - Arvaa minne menemme</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Kirjautunut: {session?.user.name ?? session?.user.id}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Kirjaudu ulos
        </button>
      </header>

      {showSuccess ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-lg text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          {successMessage}
        </p>
      ) : null}

      {!locked ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-zinc-700 dark:text-zinc-300">
            Napsauta karttaa kohdasta, jonne uskot olevamme menossa. Voit vastata
            vain kerran.
          </p>
          <GuessMap onPositionChange={onPositionChange} />
          {lat != null && lng != null ? (
            <p className="text-sm text-zinc-500">
              Valittu piste: {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || lat == null || lng == null}
            className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? "Lähetetään…" : "Lähetä arvaus"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Olet jo vastannut. Kartta näyttää valintasi.
          </p>
          <GuessMap
            disabled
            initialLat={lat}
            initialLng={lng}
          />
        </div>
      )}
    </main>
  );
}
