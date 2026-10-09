import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Search, Users } from "lucide-react";
import { Badge, Card, EmptyState, Input, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { sanitizeSearch } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/panel/clientes">) {
  const { active: organization } = await requireTitular();
  const params = await searchParams;
  const query = sanitizeSearch(params.q);
  const showArchived = params.archivados === "1";

  const supabase = await createClient();
  let request = supabase
    .from("clients")
    .select("id, full_name, kind, document_type, document_number, phone, locality, archived_at, matters(count)")
    .eq("organization_id", organization.organizationId)
    .order("full_name")
    .limit(200);
  request = showArchived ? request.not("archived_at", "is", null) : request.is("archived_at", null);
  if (query) request = request.or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%`);
  const { data: clients } = await request;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Personas y empresas que representás."
        actions={
          <Link href="/panel/clientes/nuevo" className={buttonClasses("primary", "md")}>
            <Plus aria-hidden="true" />
            Nuevo cliente
          </Link>
        }
      />

      <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-muted/60" aria-hidden="true" />
          <Input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Buscar por nombre o documento…"
            aria-label="Buscar clientes"
            className="pl-10"
          />
        </div>
        {showArchived ? <input type="hidden" name="archivados" value="1" /> : null}
        <Link
          href={showArchived ? "/panel/clientes" : "/panel/clientes?archivados=1"}
          className="text-sm font-medium text-accent-ink underline-offset-4 hover:underline sm:ml-2"
        >
          {showArchived ? "Ver activos" : "Ver archivados"}
        </Link>
      </form>

      <Card>
        {clients && clients.length > 0 ? (
          <ul className="divide-y divide-ink/8" data-testid="clients-list">
            {clients.map((client) => {
              const matterCount = client.matters[0]?.count ?? 0;
              return (
                <li key={client.id}>
                  <Link
                    href={`/panel/clientes/${client.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 font-serif text-sm text-gold-400">
                      {client.full_name
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{client.full_name}</span>
                      <span className="block truncate text-sm text-ink-muted">
                        {[
                          client.document_number ? `${client.document_type ?? "Doc."} ${client.document_number}` : null,
                          client.phone,
                          client.locality,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos de contacto"}
                      </span>
                    </span>
                    <Badge tone={matterCount > 0 ? "gold" : "neutral"}>
                      {matterCount} {matterCount === 1 ? "expediente" : "expedientes"}
                    </Badge>
                    <ChevronRight className="size-4.5 shrink-0 text-ink-muted/50" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Users aria-hidden="true" />}
            title={query ? "Sin resultados" : showArchived ? "No hay clientes archivados" : "Todavía no cargaste clientes"}
            description={query ? `No encontramos clientes para “${query}”.` : "Cargá tu primer cliente para empezar a armar sus expedientes."}
            action={
              !query && !showArchived ? (
                <Link href="/panel/clientes/nuevo" className={buttonClasses("primary", "md")}>
                  <Plus aria-hidden="true" />
                  Nuevo cliente
                </Link>
              ) : undefined
            }
          />
        )}
      </Card>
    </>
  );
}
