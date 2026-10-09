import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FolderOpen, Lock, Plus, Search } from "lucide-react";
import { Badge, Card, EmptyState, Input, PageHeader, Select } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/panel/dates";
import { matterStatusLabels, matterStatusTones, practiceAreaLabels, toOptions } from "@/lib/panel/labels";
import { sanitizeSearch } from "@/lib/panel/schemas";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expedientes" };

type MatterStatus = (typeof Constants.public.Enums.matter_status)[number];
type PracticeArea = (typeof Constants.public.Enums.practice_area)[number];

export default async function MattersPage({ searchParams }: PageProps<"/panel/expedientes">) {
  await requireTitular();
  const params = await searchParams;
  const query = sanitizeSearch(params.q);
  const status = Constants.public.Enums.matter_status.find((value) => value === params.estado) as MatterStatus | undefined;
  const area = Constants.public.Enums.practice_area.find((value) => value === params.area) as PracticeArea | undefined;

  const supabase = await createClient();
  let request = supabase
    .from("matters")
    .select("id, title, file_number, area, status, opened_on, is_sensitive, court, clients(full_name)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) request = request.eq("status", status);
  else request = request.in("status", ["consulta", "activo", "en_espera"]);
  if (area) request = request.eq("area", area);
  if (query) request = request.or(`title.ilike.%${query}%,file_number.ilike.%${query}%`);
  const { data: matters } = await request;

  return (
    <>
      <PageHeader
        title="Expedientes"
        description={status ? `Filtrando por: ${matterStatusLabels[status]}` : "Consultas y causas en curso."}
        actions={
          <Link href="/panel/expedientes/nuevo" className={buttonClasses("primary", "md")}>
            <Plus aria-hidden="true" />
            Nuevo expediente
          </Link>
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-navy-700/60" aria-hidden="true" />
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
          <option value="">Todas las áreas</option>
          {toOptions(practiceAreaLabels).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Filtrar
        </button>
      </form>

      <Card>
        {matters && matters.length > 0 ? (
          <ul className="divide-y divide-navy-900/8" data-testid="matters-list">
            {matters.map((matter) => (
              <li key={matter.id}>
                <Link href={`/panel/expedientes/${matter.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy-900">{matter.title}</span>
                      <Badge tone={matterStatusTones[matter.status]}>{matterStatusLabels[matter.status]}</Badge>
                      {matter.is_sensitive ? (
                        <Badge tone="gold">
                          <Lock className="size-3" aria-hidden="true" />
                          Sensible
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-navy-700">
                      {[
                        matter.clients?.full_name,
                        practiceAreaLabels[matter.area],
                        matter.file_number ? `Expte. ${matter.file_number}` : null,
                        matter.court,
                        `Desde ${formatDateOnly(matter.opened_on, "d MMM yyyy")}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight className="size-4.5 shrink-0 text-navy-700/50" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FolderOpen aria-hidden="true" />}
            title={query || status || area ? "Sin resultados" : "Todavía no hay expedientes"}
            description={query || status || area ? "Probá con otros filtros." : "Creá el primero desde un cliente o con el botón “Nuevo expediente”."}
          />
        )}
      </Card>
    </>
  );
}
