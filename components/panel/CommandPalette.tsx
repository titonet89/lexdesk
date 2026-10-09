"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  FilePlus2,
  FolderOpen,
  Gavel,
  Handshake,
  LayoutDashboard,
  LoaderCircle,
  Search,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { searchPanelAction, type SearchResults } from "@/lib/panel/search-actions";

export const OPEN_PALETTE_EVENT = "lexdesk:abrir-paleta";

/** Abre la paleta desde cualquier botón del panel. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

interface PaletteItem {
  label: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
}

const quickActions: PaletteItem[] = [
  { label: "Nuevo expediente", href: "/panel/expedientes/nuevo", icon: FilePlus2, keywords: ["crear", "causa"] },
  { label: "Nuevo cliente", href: "/panel/clientes/nuevo", icon: UserPlus, keywords: ["crear", "persona"] },
  { label: "Cargar vencimiento", href: "/panel/agenda/nuevo?tipo=vencimiento", icon: CalendarClock, keywords: ["plazo", "días hábiles"] },
  { label: "Agendar audiencia", href: "/panel/agenda/nuevo?tipo=audiencia", icon: Gavel, keywords: ["juzgado"] },
  { label: "Agendar reunión", href: "/panel/agenda/nuevo?tipo=reunion", icon: CalendarPlus, keywords: ["cliente", "cita"] },
];

const titularNavigation: PaletteItem[] = [
  { label: "Inicio", href: "/panel", icon: LayoutDashboard },
  { label: "Agenda", href: "/panel/agenda", icon: CalendarDays, keywords: ["calendario"] },
  { label: "Expedientes", href: "/panel/expedientes", icon: FolderOpen },
  { label: "Clientes", href: "/panel/clientes", icon: Users },
  { label: "Honorarios y cuentas por cobrar", href: "/panel/honorarios", icon: Wallet, keywords: ["cobros", "pagos", "saldo"] },
  { label: "Arancel y valor de la UMA", href: "/panel/ajustes/honorarios", icon: Settings, keywords: ["ley 6368", "colegio", "honorarios mínimos"] },
  { label: "Colaboradores", href: "/panel/colaboradores", icon: Handshake, keywords: ["colegas"] },
  { label: "Feriados y ferias judiciales", href: "/panel/ajustes/feriados", icon: Settings, keywords: ["inhábiles"] },
  { label: "Auditoría", href: "/panel/ajustes/auditoria", icon: ShieldCheck, keywords: ["registro"] },
  { label: "Seguridad de la cuenta", href: "/panel/ajustes/seguridad", icon: ShieldCheck, keywords: ["contraseña", "2fa"] },
];

const collaboratorNavigation: PaletteItem[] = [
  { label: "Compartidos conmigo", href: "/panel", icon: FolderOpen },
  { label: "Seguridad de la cuenta", href: "/panel/ajustes/seguridad", icon: ShieldCheck, keywords: ["contraseña", "2fa"] },
];

function Item({ value, icon: Icon, children, detail, onSelect }: { value: string; icon: LucideIcon; children: ReactNode; detail?: string; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft data-[selected=true]:bg-accent-soft data-[selected=true]:text-ink"
    >
      <Icon className="size-4.5 shrink-0 text-accent-ink" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{children}</span>
        {detail ? <span className="block truncate text-xs text-ink-muted">{detail}</span> : null}
      </span>
    </Command.Item>
  );
}

const groupClasses =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:uppercase";

export function CommandPalette({ role }: { role: "titular" | "colaborador" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ matters: [], clients: [] });
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  const searchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  // Búsqueda en el servidor con espera breve entre teclas; se descartan respuestas viejas.
  function handleQueryChange(value: string) {
    setQuery(value);
    window.clearTimeout(searchTimer.current);
    const term = value.trim();
    const id = ++requestId.current;
    if (term.length < 2) {
      setResults({ matters: [], clients: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = window.setTimeout(async () => {
      const found = await searchPanelAction(term);
      if (id === requestId.current) {
        setResults(found);
        setSearching(false);
      }
    }, 200);
  }

  function go(href: string) {
    setOpen(false);
    handleQueryChange("");
    router.push(href);
  }

  const navigation = role === "titular" ? titularNavigation : collaboratorNavigation;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) handleQueryChange("");
      }}
      label="Paleta de comandos"
      overlayClassName="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-[2px]"
      contentClassName="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-ink/8 px-4">
        {searching ? (
          <LoaderCircle className="size-5 shrink-0 animate-spin text-ink-muted" aria-hidden="true" />
        ) : (
          <Search className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        )}
        <Command.Input
          value={query}
          onValueChange={handleQueryChange}
          placeholder={role === "titular" ? "Buscar expedientes, clientes o acciones…" : "Buscar expedientes compartidos…"}
          className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-muted/70 focus-visible:outline-none"
        />
        <kbd className="hidden rounded-md border border-ink/15 px-1.5 py-0.5 text-[11px] text-ink-muted sm:block">Esc</kbd>
      </div>

      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2" data-testid="command-list">
        <Command.Empty className="px-3 py-8 text-center text-sm text-ink-muted">
          {searching ? "Buscando…" : "Sin resultados."}
        </Command.Empty>

        {results.matters.length > 0 ? (
          <Command.Group heading="Expedientes" className={groupClasses}>
            {results.matters.map((result) => (
              <Item key={result.id} value={`expediente ${result.title} ${result.detail} ${result.id}`} icon={FolderOpen} detail={result.detail} onSelect={() => go(result.href)}>
                {result.title}
              </Item>
            ))}
          </Command.Group>
        ) : null}

        {results.clients.length > 0 ? (
          <Command.Group heading="Clientes" className={groupClasses}>
            {results.clients.map((result) => (
              <Item key={result.id} value={`cliente ${result.title} ${result.detail} ${result.id}`} icon={Users} detail={result.detail} onSelect={() => go(result.href)}>
                {result.title}
              </Item>
            ))}
          </Command.Group>
        ) : null}

        {role === "titular" ? (
          <Command.Group heading="Acciones rápidas" className={groupClasses}>
            {quickActions.map((action) => (
              <Item key={action.href} value={[action.label, ...(action.keywords ?? [])].join(" ")} icon={action.icon} onSelect={() => go(action.href)}>
                {action.label}
              </Item>
            ))}
          </Command.Group>
        ) : null}

        <Command.Group heading="Ir a" className={groupClasses}>
          {navigation.map((item) => (
            <Item key={item.href} value={["ir a", item.label, ...(item.keywords ?? [])].join(" ")} icon={item.icon} onSelect={() => go(item.href)}>
              {item.label}
            </Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
