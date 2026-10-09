import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Columns3, FolderOpen, List, Lock, Plus, Search } from "lucide-react";
import { StageBoard, type BoardMatter } from "@/components/panel/matters/StageBoard";
import { Badge, Card, EmptyState, Input, PageHeader, Select } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/panel/dates";
import {
  matterStatusLabels,
  matterStatusTones,
  practiceAreaLabels,
  stageLabels,
  stageTones,
  toOptions,
} from "@/lib/panel/labels";
import { formatFileNumber } from "@/lib/panel/matters";
import { sanitizeSearch, uuidSchema } from "@/lib/panel/schemas";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Expedientes" };

type MatterStatus = (typeof Constants.public.Enums.matter_status)[number];
type PracticeArea = (typeof Constants.public.Enums.practice_area)[number];

export default async function MattersPage({ searchParams }: PageProps<"/panel/expedientes">) {
  const { active: organization } = await requireTitular();
  const params = await searchParams;
  const view = params.vista === "tablero" ? "tablero" : "lista";
  const query = sanitizeSearch(params.q);
  const status = Constants.public.Enums.matter_status.find((value) => value === params.estado) as MatterStatus | undefined;
  const area = Constants.public.Enums.practice_area.find((value) => value === params.area) as PracticeArea | undefined;
  const forum = typeof params.fuero === "string" ? params.fuero.slice(0, 100) : "";
  const clientId = typeof params.cliente === "string" && uuidSchema.safeParse(params.cliente).success ? params.cliente : "";

  const supabase = await createClient();
  let request = supabase
    .from("matters")
    .select("id, title, file_number, file_year, area, status, stage, forum, opened_on, is_sensitive, court, clients(full_name)")
    .eq("organization_id", organization.organizationId)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (status) request = request.eq("status", status);
  else request = request.in("status", ["consulta", "activo", "en_espera"]);
  if (area) request = request.eq("area", area);
  if (forum) request = request.eq("forum", forum);
  if (clientId) request = request.eq("client_id", clientId);
  if (query) request = request.or(`title.ilike.%${query}%,file_number.ilike.%${query}%`);

  const [{ data: matters }, { data: filterSource }, { data: clients }] = await Promise.all([
    request,
    supabase.from("matters").select("forum").eq("organization_id", organization.organizationId).not("forum", "is", null),
    supabase.from("clients").select("id, full_name").eq("organization_id", organization.organizationId).order("full_name"),
  ]);
  const forums = [...new Set((filterSource ?? []).map((row) => row.forum).filter((value): value is string => Boolean(value)))].sort();
  const hasFilters = Boolean(query || status || area || forum || clientId);

  const viewHref = (target: "lista" | "tablero") => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (typeof value === "string" && key !== "vista") search.set(key, value);
    if (target === "tablero") search.set("vista", "tablero");
    const qs = search.toString();
    return `/panel/expedientes${qs ? `?${qs}` : ""}`;
  };

  const boardMatters: BoardMatter[] = (matters ?? []).map((matter) => ({
    id: matter.id,
    title: matter.title,
    clientName: matter.clients?.full_name ?? null,
    fileLabel: formatFileNumber(matter.file_number, matter.file_year),
    area: matter.area,
    stage: matter.stage,
    isSensitive: matter.is_sensitive,
  }));

  return (
    <>
      <PageHeader
        title="Expedientes"
        description={status ? `Filtrando por: ${matterStatusLabels[status]}` : "Consultas y causas en curso."}
        actions={
          <>
            <nav aria-label="Vista" className="flex rounded-full bg-ink/5 p-1">
              {(
                [
                  { id: "lista", label: "Lista", icon: List },
                  { id: "tablero", label: "Tablero", icon: Columns3 },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <Link
                  key={id}
                  href={viewHref(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                    view === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
            <Link href="/panel/expedientes/nuevo" className={buttonClasses("primary", "md")}>
              <Plus aria-hidden="true" />
              Nuevo expediente
            </Link>
          </>
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]" role="search">
        {view === "tablero" ? <input type="hidden" name="vista" value="tablero" /> : null}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-muted/60" aria-hidden="true" />
          <Input name="q" type="search" defaultValue={query} placeholder="Buscar por carátula o número…" aria-label="Buscar expedientes" className="pl-10" />
        </div>
        <Select name="estado" defaultValue={status ?? ""} aria-label="Estado">
          <option value="">En curso</option>
          {toOptions(matterStatusLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select name="area" defaultValue={area ?? ""} aria-label="Área">
          <option value="">Área</option>
          {toOptions(practiceAreaLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select name="fuero" defaultValue={forum} aria-label="Fuero">
          <option value="">Fuero</option>
          {forums.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Select name="cliente" defaultValue={clientId} aria-label="Cliente">
          <option value="">Cliente</option>
          {(clients ?? []).map((client) => (
            <option key={client.id} value={client.id}>
              {client.full_name}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses("secondary", "md", "flex-1")}>
            Filtrar
          </button>
          {hasFilters ? (
            <Link href={viewHref(view)} className={buttonClasses("ghost", "md")} aria-label="Quitar filtros">
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      {view === "tablero" ? (
        boardMatters.length > 0 ? (
          <StageBoard matters={boardMatters} />
        ) : (
          <Card>
            <EmptyState icon={<FolderOpen aria-hidden="true" />} title="Sin expedientes para mostrar" />
          </Card>
        )
      ) : (
        <Card>
          {matters && matters.length > 0 ? (
            <ul className="divide-y divide-ink/8" data-testid="matters-list">
              {matters.map((matter) => (
                <li key={matter.id}>
                  <Link href={`/panel/expedientes/${matter.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{matter.title}</span>
                        <Badge tone={stageTones[matter.stage]}>{stageLabels[matter.stage]}</Badge>
                        <Badge tone={matterStatusTones[matter.status]}>{matterStatusLabels[matter.status]}</Badge>
                        {matter.is_sensitive ? (
                          <Badge tone="gold">
                            <Lock className="size-3" aria-hidden="true" />
                            Sensible
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-sm text-ink-muted">
                        {[
                          matter.clients?.full_name,
                          practiceAreaLabels[matter.area],
                          matter.forum,
                          formatFileNumber(matter.file_number, matter.file_year),
                          matter.court,
                          `Desde ${formatDateOnly(matter.opened_on, "d MMM yyyy")}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronRight className="size-4.5 shrink-0 text-ink-muted/50" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FolderOpen aria-hidden="true" />}
              title={hasFilters ? "Sin resultados" : "Todavía no hay expedientes"}
              description={hasFilters ? "Probá con otros filtros." : "Creá el primero desde un cliente o con el botón “Nuevo expediente”."}
            />
          )}
        </Card>
      )}
    </>
  );
}
