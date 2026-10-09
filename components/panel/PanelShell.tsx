"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { switchOrganizationAction } from "@/lib/auth/org-actions";
import { cn } from "@/lib/utils";

type Role = "titular" | "colaborador";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia exacta (para "Inicio"). */
  exact?: boolean;
}

const titularNav: NavItem[] = [
  { href: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/panel/expedientes", label: "Expedientes", icon: FolderOpen },
  { href: "/panel/clientes", label: "Clientes", icon: Users },
  { href: "/panel/colaboradores", label: "Colaboradores", icon: Handshake },
  { href: "/panel/ajustes", label: "Ajustes", icon: Settings },
];

const collaboratorNav: NavItem[] = [
  { href: "/panel", label: "Compartidos conmigo", icon: FolderOpen, exact: true },
  { href: "/panel/ajustes/seguridad", label: "Seguridad", icon: Settings },
];

interface Organization {
  id: string;
  name: string;
  role: Role;
}

interface PanelShellProps {
  role: Role;
  displayName: string;
  activeOrganization: { id: string; name: string };
  organizations: Organization[];
  children: ReactNode;
}

function initials(name: string): string {
  return name
    .replace(/^estudio\s+/i, "")
    .split(/\s+/)
    .filter((word) => /^[\p{L}]/u.test(word) && !/^(de|del|la|las|los|y)$/i.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active ? "bg-gold-600 text-navy-950" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Estudio activo y, si la persona pertenece a varios, el selector para cambiar. */
function OrganizationSwitcher({ active, organizations }: { active: PanelShellProps["activeOrganization"]; organizations: Organization[] }) {
  const header = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-600/15 font-serif text-sm text-gold-400">
        {initials(active.name) || "E"}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">Estudio</span>
        <span className="block truncate text-sm font-semibold text-white" data-testid="active-organization">
          {active.name}
        </span>
      </span>
    </>
  );

  if (organizations.length < 2) {
    return <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">{header}</div>;
  }

  return (
    <details className="group rounded-xl bg-white/5">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        {header}
        <ChevronsUpDown className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
      </summary>
      <ul className="space-y-0.5 border-t border-white/10 p-1.5">
        {organizations.map((organization) => (
          <li key={organization.id}>
            <form action={switchOrganizationAction.bind(null, organization.id)}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
              >
                <span className="min-w-0 flex-1 truncate">{organization.name}</span>
                <span className="text-[10px] text-slate-400 uppercase">{organization.role === "titular" ? "Titular" : "Colab."}</span>
                {organization.id === active.id ? <Check className="size-4 text-gold-400" aria-label="Activo" /> : null}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </details>
  );
}

function SidebarContent({
  items,
  role,
  displayName,
  activeOrganization,
  organizations,
  onNavigate,
}: Omit<PanelShellProps, "children"> & { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/panel" onClick={onNavigate} className="flex items-center gap-2.5 px-2 text-white">
        <span className="grid size-9 place-items-center rounded-full border border-gold-600/60 text-gold-400">
          <Scale className="size-4.5" aria-hidden="true" />
        </span>
        <span className="font-serif text-xl leading-none tracking-tight">
          Lex<span className="text-gold-400">Desk</span>
        </span>
      </Link>

      <div className="mt-6">
        <OrganizationSwitcher active={activeOrganization} organizations={organizations} />
      </div>

      <nav aria-label="Panel" className="mt-6 flex-1">
        <NavLinks items={items} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-white/10 pt-4">
        <p className="truncate px-3 text-sm font-semibold text-white">{displayName}</p>
        <p className="px-3 text-xs text-slate-400">{role === "titular" ? "Titular" : "Colaborador/a"}</p>
        <form action={() => signOutAction()} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4.5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export function PanelShell({ role, displayName, activeOrganization, organizations, children }: PanelShellProps) {
  const [open, setOpen] = useState(false);
  const items = role === "titular" ? titularNav : collaboratorNav;
  const sidebarProps = { role, displayName, activeOrganization, organizations, items };

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#panel-contenido"
        className="sr-only rounded-full bg-gold-600 px-4 py-2 font-semibold text-navy-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-900 px-4 py-6 lg:block">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-navy-900 px-4 text-white lg:hidden">
        <Link href="/panel" className="flex min-w-0 items-center gap-2.5">
          <Scale className="size-5 shrink-0 text-gold-400" aria-hidden="true" />
          <span className="truncate font-serif text-base">{activeOrganization.name}</span>
        </Link>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="grid size-10 place-items-center rounded-lg" aria-label="Abrir menú del panel">
            <Menu className="size-6" aria-hidden="true" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-xs bg-navy-900 px-4 py-6 shadow-2xl">
              <Dialog.Title className="sr-only">Menú del panel</Dialog.Title>
              <Dialog.Description className="sr-only">Navegación del panel profesional</Dialog.Description>
              <Dialog.Close
                className="absolute top-5 right-3 grid size-9 place-items-center rounded-lg text-white"
                aria-label="Cerrar menú"
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
              <SidebarContent {...sidebarProps} onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <main id="panel-contenido" className="px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
