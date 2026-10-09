import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, ChevronRight, FileClock, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Ajustes" };

const items: { href: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    href: "/panel/ajustes/seguridad",
    title: "Seguridad de la cuenta",
    description: "Tus datos, contraseña, verificación en dos pasos y sesiones.",
    icon: ShieldCheck,
  },
  {
    href: "/panel/ajustes/feriados",
    title: "Feriados y ferias judiciales",
    description: "Días inhábiles que se saltean al calcular plazos.",
    icon: CalendarOff,
  },
  {
    href: "/panel/ajustes/honorarios",
    title: "Arancel y UMA",
    description: "Valor de la UMA y honorarios de referencia (Ley 6368 de Jujuy), editables.",
    icon: Wallet,
  },
  {
    href: "/panel/ajustes/auditoria",
    title: "Auditoría",
    description: "Registro de altas, cambios, bajas y accesos a la información.",
    icon: FileClock,
  },
];

export default async function SettingsPage() {
  await requireTitular();
  return (
    <>
      <PageHeader title="Ajustes" />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full flex-col rounded-2xl border border-ink/8 bg-surface p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgb(15_23_42/0.3)]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-4 flex items-center justify-between font-serif text-lg text-ink">
                {title}
                <ChevronRight className="size-4.5 text-ink-muted/50 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="mt-1 text-sm text-ink-muted">{description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
