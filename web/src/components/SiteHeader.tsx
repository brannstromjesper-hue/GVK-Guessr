import Image from "next/image";
import Link from "next/link";

/** Bump when replacing `public/gvk-logo.png` so browsers skip cached images. */
const LOGO_VERSION = "2";

export default function SiteHeader() {
  return (
    <header className="shrink-0 border-b border-zinc-800/90 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-3 sm:py-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-md outline-none ring-amber-500/50 transition-opacity hover:opacity-90 focus-visible:ring-2"
        >
          <Image
            src={`/gvk-logo.png?v=${LOGO_VERSION}`}
            alt="Gamlakarleby Vänskapsklubb"
            width={640}
            height={360}
            className="h-16 w-auto sm:h-20 md:h-24"
            priority
            unoptimized
          />
        </Link>
      </div>
    </header>
  );
}
