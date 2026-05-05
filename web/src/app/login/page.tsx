"use client";

import Link from "next/link";
import { buildApiUrl } from "@/lib/api-url";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const DEFAULT_CALLBACK_URL = "/guess";
const LOGIN_ERROR_MESSAGE = "Nimeä ei löydy jäsenlistalta (tai lista on tyhjä).";
const GENERIC_ERROR_MESSAGE = "Jotain meni pieleen. Yritä uudelleen.";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? DEFAULT_CALLBACK_URL;
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setError(LOGIN_ERROR_MESSAGE);
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Nimi
        </span>
        <input
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          placeholder="Kuten listalla"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Kirjaudutaan…" : "Kirjaudu"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Skriiv in de
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Kirjaudu sisään muodossa: Etunimi Sukunimen eka kirjain. Esim Anu S. Sinulla on yksi arvaus veikata minne mennään..
        </p>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Ladataan…</p>}>
        <LoginForm />
      </Suspense>
      <Link
        href="/"
        className="text-center text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Takaisin etusivulle
      </Link>
    </main>
  );
}
