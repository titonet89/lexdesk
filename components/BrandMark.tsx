import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

interface BrandMarkProps {
  className?: string;
}

/**
 * Monograma con las iniciales de la profesional: iniciales serif
 * dentro de un arco fino. Escala con el tamaño de fuente del contenedor.
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid size-10 shrink-0 place-items-center rounded-full border border-gold-600/60 font-serif text-[0.8rem] leading-none tracking-tight text-gold-400",
        className,
      )}
    >
      <span className="translate-y-[0.04em]">{siteConfig.lawyer.monogram}</span>
    </span>
  );
}
