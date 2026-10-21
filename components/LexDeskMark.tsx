import { Scale } from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** "Lex" en blanco y "Desk" en dorado, en la tipografía serif del panel. */
export function LexDeskWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-serif leading-none tracking-tight", className)}>
      Lex<span className="text-gold-400">Desk</span>
    </span>
  );
}

/**
 * Logotipo de LexDesk con su subtítulo. Pensado para fondos navy.
 *
 * - `sidebar`: encabezado del panel, con la balanza.
 * - `footer`: firma discreta al pie de la pantalla de acceso.
 */
export function LexDeskMark({ variant }: { variant: "sidebar" | "footer" }) {
  if (variant === "footer") {
    return (
      <p className="flex items-center justify-center gap-2 text-slate-400" title={brand.meaning}>
        <Scale className="size-3.5 text-gold-600" aria-hidden="true" />
        <LexDeskWordmark className="text-sm text-slate-200" />
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="text-[11px] tracking-[0.18em] uppercase">{brand.tagline}</span>
      </p>
    );
  }

  return (
    <span className="flex items-center gap-2.5" title={brand.meaning}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gold-600/60 text-gold-400">
        <Scale className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <LexDeskWordmark className="text-xl" />
        <span className="mt-1 text-[9.5px] font-medium tracking-[0.12em] whitespace-nowrap text-slate-400 uppercase">{brand.tagline}</span>
      </span>
    </span>
  );
}
