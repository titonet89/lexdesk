import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { LexDeskMark } from "@/components/LexDeskMark";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Acceso profesional",
  robots: { index: false, follow: false },
};

export default function AccessLayout({ children }: LayoutProps<"/acceso">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-navy-900 px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-20%] -z-10 size-[40rem] rounded-full bg-gold-600/15 blur-3xl"
      />
      <Link href="/" className="mb-8 flex items-center gap-3 text-white">
        <BrandMark className="size-12 text-base" />
        <span className="flex flex-col">
          <span className="font-serif text-xl leading-none">{siteConfig.lawyer.shortName}</span>
          <span className="mt-1.5 text-[10px] font-medium tracking-[0.3em] text-gold-400 uppercase">
            Panel profesional
          </span>
        </span>
      </Link>
      <main id="contenido" className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl sm:p-8">
        {children}
      </main>
      <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-slate-400">
        Acceso restringido. Toda actividad queda registrada y está amparada por el secreto profesional.
      </p>
      <footer className="mt-10">
        <LexDeskMark variant="footer" />
      </footer>
    </div>
  );
}
