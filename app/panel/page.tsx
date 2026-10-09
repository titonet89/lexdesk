import type { Metadata } from "next";
import Link from "next/link";
import { addDays } from "date-fns";
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  FolderOpen,
  Gavel,
  Plus,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/session";
import { formatDateOnly, formatInZone, nowInZone, relativeDayLabel } from "@/lib/panel/dates";
import {
  entryKindLabels,
  eventKindLabels,
  eventKindTones,
  sharePermissionLabels,
} from "@/lib/panel/labels";
import { firstName } from "@/lib/panel/names";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inicio" };

function Stat({ icon: Icon, label, value, href, alert }: { icon: LucideIcon; label: string; value: number; href: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-navy-900/8 bg-white p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgb(15_23_42/0.3)]"
    >
      <span className={cn("grid size-10 place-items-center rounded-xl", alert ? "bg-red-50 text-red-700" : "bg-gold-50 text-gold-700")}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 font-serif text-4xl leading-none text-navy-900 tabular-nums">{value}</p>
      <p className="mt-1.5 text-sm text-navy-700">{label}</p>
    </Link>
  );
}

async function CollaboratorHome({ displayName }: { displayName: string }) {
  const supabase = await createClient();
  const { data: shares } = await supabase
    .from("matter_shares")
    .select("id, permission, include_documents, expires_at, matters(id, title, area, status)")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const active = (shares ?? []).filter(
    (share) => share.matters && (!share.expires_at || new Date(share.expires_at) > new Date()),
  );

  return (
    <>
      <PageHeader title={`Hola, ${firstName(displayName)}`} description="Expedientes que te compartieron para revisar." />
      <Card>
        {active.length > 0 ? (
          <ul className="divide-y divide-navy-900/8">
            {active.map((share) => (
              <li key={share.id}>
                <Link href={`/panel/expedientes/${share.matters!.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <FolderOpen className="size-5 shrink-0 text-gold-700" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-navy-900">{share.matters!.title}</span>
                    <span className="text-sm text-navy-700">
                      {sharePermissionLabels[share.permission]}
                      {share.expires_at ? ` · Hasta el ${formatInZone(share.expires_at, "d MMM yyyy")}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4.5 text-navy-700/50" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FolderOpen aria-hidden="true" />}
            title="No tenés expedientes compartidos"
            description="Cuando la titular te comparta un expediente, lo vas a ver acá."
          />
        )}
      </Card>
    </>
  );
}

export default async function PanelHomePage() {
  const { profile, active: organization } = await requireMember();
  const displayName = profile.full_name || profile.email;
  if (organization.role !== "titular") return <CollaboratorHome displayName={displayName} />;

  const supabase = await createClient();
  const now = nowInZone();
  const in7Days = addDays(now, 7).toISOString();
  const in14Days = addDays(now, 14).toISOString();

  const [activeMatters, clients, weekDeadlines, weekHearings, upcoming, overdue, latestEntries] = await Promise.all([
    supabase.from("matters").select("id", { count: "exact", head: true }).eq("organization_id", organization.organizationId).in("status", ["activo", "en_espera"]),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("organization_id", organization.organizationId).is("archived_at", null),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.organizationId)
      .eq("kind", "vencimiento")
      .eq("status", "pendiente")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in7Days),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.organizationId)
      .eq("kind", "audiencia")
      .eq("status", "pendiente")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in7Days),
    supabase
      .from("events")
      .select("id, title, kind, priority, starts_at, all_day, matters(id, title)")
      .eq("organization_id", organization.organizationId)
      .eq("status", "pendiente")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", in14Days)
      .order("starts_at")
      .limit(12),
    supabase
      .from("events")
      .select("id, title, kind, starts_at, matters(id, title)")
      .eq("organization_id", organization.organizationId)
      .eq("status", "pendiente")
      .in("kind", ["vencimiento", "audiencia", "tramite"])
      .lt("starts_at", now.toISOString())
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("matter_entries")
      .select("id, summary, kind, occurred_on, matters!inner(id, title, organization_id)")
      .eq("matters.organization_id", organization.organizationId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName(displayName)}`}
        description={formatInZone(now, "EEEE d 'de' MMMM 'de' yyyy")}
        actions={
          <>
            <Link href="/panel/agenda/nuevo" className={buttonClasses("ghost", "md", "border border-navy-900/15")}>
              <CalendarPlus aria-hidden="true" />
              Agendar
            </Link>
            <Link href="/panel/expedientes/nuevo" className={buttonClasses("primary", "md")}>
              <Plus aria-hidden="true" />
              Nuevo expediente
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat icon={FolderOpen} label="Expedientes en curso" value={activeMatters.count ?? 0} href="/panel/expedientes" />
        <Stat icon={CalendarClock} label="Vencimientos en 7 días" value={weekDeadlines.count ?? 0} href="/panel/agenda" alert={(weekDeadlines.count ?? 0) > 0} />
        <Stat icon={Gavel} label="Audiencias en 7 días" value={weekHearings.count ?? 0} href="/panel/agenda" />
        <Stat icon={Users} label="Clientes activos" value={clients.count ?? 0} href="/panel/clientes" />
      </div>

      {overdue.data && overdue.data.length > 0 ? (
        <Card className="mt-5 border-red-200 bg-red-50/40">
          <div className="flex items-center gap-2 border-b border-red-200 px-5 py-3 text-red-800">
            <TriangleAlert className="size-5" aria-hidden="true" />
            <h2 className="font-semibold">Pendientes con fecha vencida</h2>
          </div>
          <ul className="divide-y divide-red-100">
            {overdue.data.map((event) => (
              <li key={event.id}>
                <Link href={`/panel/agenda/${event.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-red-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-navy-900">{event.title}</span>
                    <span className="text-sm text-red-800">
                      {eventKindLabels[event.kind]} · {formatInZone(event.starts_at, "d MMM")} ({relativeDayLabel(event.starts_at)})
                    </span>
                  </span>
                  <ChevronRight className="size-4.5 text-navy-700/50" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader
            title="Próximos 14 días"
            action={
              <Link href="/panel/agenda" className="text-sm font-medium text-gold-700 hover:underline">
                Ver agenda
              </Link>
            }
          />
          {upcoming.data && upcoming.data.length > 0 ? (
            <ul className="divide-y divide-navy-900/8">
              {upcoming.data.map((event) => (
                <li key={event.id}>
                  <Link href={`/panel/agenda/${event.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                    <span className="w-14 shrink-0 text-center">
                      <span className="block text-xs font-semibold text-gold-700 uppercase">{formatInZone(event.starts_at, "MMM")}</span>
                      <span className="block font-serif text-2xl leading-none text-navy-900">{formatInZone(event.starts_at, "d")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium text-navy-900">{event.title}</span>
                        <Badge tone={eventKindTones[event.kind]}>{eventKindLabels[event.kind]}</Badge>
                        {event.priority === "critica" ? <Badge tone="red">Crítico</Badge> : null}
                      </span>
                      <span className="block truncate text-sm text-navy-700">
                        {relativeDayLabel(event.starts_at)}
                        {event.all_day ? "" : ` · ${formatInZone(event.starts_at, "HH:mm")} h`}
                        {event.matters ? ` · ${event.matters.title}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarClock aria-hidden="true" />} title="Sin eventos próximos" description="No hay vencimientos, audiencias ni reuniones en los próximos 14 días." />
          )}
        </Card>

        <Card>
          <CardHeader title="Últimas actuaciones" />
          {latestEntries.data && latestEntries.data.length > 0 ? (
            <ul className="divide-y divide-navy-900/8">
              {latestEntries.data.map((entry) => (
                <li key={entry.id}>
                  <Link href={`/panel/expedientes/${entry.matters?.id ?? ""}`} className="block px-5 py-3.5 hover:bg-slate-50">
                    <span className="block truncate font-medium text-navy-900">{entry.summary}</span>
                    <span className="block truncate text-sm text-navy-700">
                      {entryKindLabels[entry.kind]} · {formatDateOnly(entry.occurred_on, "d MMM")}
                      {entry.matters ? ` · ${entry.matters.title}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<FolderOpen aria-hidden="true" />} title="Sin actuaciones" description="Las actuaciones que cargues en los expedientes aparecerán acá." />
          )}
        </Card>
      </div>
    </>
  );
}
