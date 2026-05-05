"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildApiUrl } from "@/lib/api-url";

export default function Home() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  useEffect(() => {
    async function loadSession() {
      const res = await fetch(buildApiUrl("/api/auth/session"));
      setStatus(res.ok ? "authenticated" : "unauthenticated");
    }
    void loadSession();
  }, []);
  const isAuthenticated = status === "authenticated";
  const ctaHref = isAuthenticated ? "/guess" : "/login";
  const ctaLabel = isAuthenticated ? "Siirry kartalle" : "Kirjaudu arvaamaan";

  return (
    <main className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251,191,36,0.18), transparent)",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <div className="space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-400/90">
            GVK Vuosikokous
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Vart e vi påväg? Minne luulet meidän menevän?
          </h1>
          <p className="text-lg leading-relaxed text-zinc-400">
            Kirjaudu sisään nimelläsi (etunimi ja sukunimen ensimmäinen kirjain), aseta neula kartalle ja lähetä
            arvauksesi.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={ctaHref}
            className="inline-flex w-full max-w-xs justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-300 sm:w-auto"
          >
            {ctaLabel}
          </Link>
        </div>

        {isAuthenticated ? (
          <p className="text-center text-xs text-zinc-500">
            <Link
              href="/admin"
              className="text-amber-400/90 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-300"
            >
              Katso tulokset (ylläpito)
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
