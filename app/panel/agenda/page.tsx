import type { Metadata } from "next";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { WeekView } from "@/components/panel/agenda/WeekView";
import { formatInZone, nowInZone, parseDateOnly, todayIso, toDateOnly, zonedInputToIso } from "@/lib/panel/dates";
import { eventKindDot, eventKindLabels, eventKindTones, toOptions } from "@/lib/panel/labels";
import { Constants } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agenda" };

type EventKind = (typeof Constants.public.Enums.event_kind)[number];

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** "23 al 29 de noviembre de 2026" · "30 de noviembre al 6 de diciembre de 2026" */
function weekRangeLabel(start: Date, end: Date): string {
  const endLabel = format(end, "d 'de' MMMM 'de' yyyy", { locale: es });
  if (start.getMonth() === end.getMonth()) return `${format(start, "d")} al ${endLabel}`;
  if (start.getFullYear() === end.getFullYear()) return `${format(start, "d 'de' MMMM", { locale: es })} al ${endLabel}`;
  return `${format(start, "d 'de' MMMM 'de' yyyy", { locale: es })} al ${endLabel}`;
}

export default async function AgendaPage({ searchParams }: PageProps<"/panel/agenda">) {
  const { active: organization } = await requireTitular();
  const params = await searchParams;

  const today = todayIso();
  const monthParam = typeof params.mes === "string" && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : today.slice(0, 7);
  const monthDate = parseDateOnly(`${monthParam}-01`);
  const kind = Constants.public.Enums.event_kind.find((value) => value === params.tipo) as EventKind | undefined;
  const showDone = params.cumplidos === "1";

  const view = params.vista === "semana" ? "semana" : "mes";
  const weekView = view === "semana";
  const weekParam = typeof params.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.semana) ? params.semana : today;
  const weekStart = startOfWeek(parseDateOnly(weekParam), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const gridStart = view === "semana" ? weekStart : startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = view === "semana" ? weekDays[6] : endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);

  const supabase = await createClient();
  let request = supabase
    .from("events")
    .select("id, title, kind, priority, is_peremptory, status, starts_at, ends_at, all_day, location, matters(title)")
    .eq("organization_id", organization.organizationId)
    .gte("starts_at", zonedInputToIso(toDateOnly(gridStart), "00:00"))
    .lte("starts_at", zonedInputToIso(toDateOnly(gridEnd), "23:59"))
    .order("starts_at");
  if (kind) request = request.eq("kind", kind);
  if (!showDone) request = request.eq("status", "pendiente");

  const [{ data: events }, { data: nonWorking }] = await Promise.all([
    request,
    supabase
      .from("non_working_days")
      .select("day, description, kind")
      .eq("organization_id", organization.organizationId)
      .gte("day", toDateOnly(gridStart))
      .lte("day", toDateOnly(gridEnd)),
  ]);

  const byDay = new Map<string, NonNullable<typeof events>>();
  for (const event of events ?? []) {
    const key = formatInZone(event.starts_at, "yyyy-MM-dd");
    byDay.set(key, [...(byDay.get(key) ?? []), event]);
  }
  const nonWorkingByDay = new Map((nonWorking ?? []).map((item) => [item.day, item.description]));

  const monthEvents = (events ?? []).filter((event) => formatInZone(event.starts_at, "yyyy-MM") === monthParam);

  const query = (overrides: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const values = {
      vista: view === "semana" ? "semana" : undefined,
      mes: view === "mes" ? monthParam : undefined,
      semana: view === "semana" ? toDateOnly(weekStart) : undefined,
      tipo: kind,
      cumplidos: showDone ? "1" : undefined,
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) if (value) search.set(key, value);
    return `/panel/agenda?${search.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Audiencias, vencimientos, reuniones y trámites."
        actions={
          <>
            <nav aria-label="Vista de la agenda" className="flex rounded-full bg-ink/5 p-1">
              {(
                [
                  { id: "mes", label: "Mes", href: query({ vista: undefined, semana: undefined, mes: format(weekView ? weekStart : monthDate, "yyyy-MM") }) },
                  { id: "semana", label: "Semana", href: query({ vista: "semana", mes: undefined, semana: weekView ? toDateOnly(weekStart) : monthParam === today.slice(0, 7) ? today : `${monthParam}-01` }) },
                ] as const
              ).map((option) => (
                <Link
                  key={option.id}
                  href={option.href}
                  aria-current={view === option.id ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
                    view === option.id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
            <Link href="/panel/agenda/nuevo" className={buttonClasses("primary", "md")}>
              <Plus aria-hidden="true" />
              Nuevo evento
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={query({ tipo: undefined })} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", !kind ? "bg-ink text-surface" : "bg-surface text-ink-soft ring-1 ring-ink/10")}>
          Todos
        </Link>
        {toOptions(eventKindLabels).map((option) => (
          <Link
            key={option.value}
            href={query({ tipo: option.value })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
              kind === option.value ? "bg-ink text-surface" : "bg-surface text-ink-soft ring-1 ring-ink/10",
            )}
          >
            <span className={cn("size-2 rounded-full", eventKindDot[option.value])} aria-hidden="true" />
            {option.label}
          </Link>
        ))}
        <Link href={query({ cumplidos: showDone ? undefined : "1" })} className="ml-auto text-sm font-medium text-accent-ink hover:underline">
          {showDone ? "Ocultar cumplidos y cancelados" : "Mostrar cumplidos y cancelados"}
        </Link>
      </div>

      {weekView ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href={query({ semana: toDateOnly(addDays(weekStart, -7)) })} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5" aria-label="Semana anterior">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Link>
            <div className="text-center">
              <h2 className="font-serif text-xl text-ink" data-testid="week-title">
                {weekRangeLabel(weekStart, weekDays[6])}
              </h2>
              {!weekDays.some((day) => toDateOnly(day) === today) ? (
                <Link href={query({ semana: today })} className="text-xs font-medium text-accent-ink hover:underline">
                  Ir a esta semana
                </Link>
              ) : null}
            </div>
            <Link href={query({ semana: toDateOnly(addDays(weekStart, 7)) })} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5" aria-label="Semana siguiente">
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          </div>
          <WeekView
            days={weekDays}
            events={events ?? []}
            nonWorking={nonWorkingByDay}
            today={today}
            nowMinutes={nowInZone().getHours() * 60 + nowInZone().getMinutes()}
          />
        </>
      ) : (
      <>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3 sm:px-5">
          <Link href={query({ mes: format(subMonths(monthDate, 1), "yyyy-MM") })} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5" aria-label="Mes anterior">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="text-center">
            <h2 className="font-serif text-xl text-ink capitalize">{format(monthDate, "MMMM yyyy", { locale: es })}</h2>
            {monthParam !== today.slice(0, 7) ? (
              <Link href={query({ mes: today.slice(0, 7) })} className="text-xs font-medium text-accent-ink hover:underline">
                Ir a hoy
              </Link>
            ) : null}
          </div>
          <Link href={query({ mes: format(addMonths(monthDate, 1), "yyyy-MM") })} className="grid size-10 place-items-center rounded-lg hover:bg-ink/5" aria-label="Mes siguiente">
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-ink/8 bg-canvas text-center text-xs font-semibold text-ink-muted">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7" data-testid="calendar-grid">
          {days.map((day) => {
            const key = toDateOnly(day);
            const dayEvents = byDay.get(key) ?? [];
            const outside = !isSameMonth(day, monthDate);
            const isToday = key === today;
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const holiday = nonWorkingByDay.get(key);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-16 border-r border-b border-ink/6 p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0",
                  outside && "bg-canvas/70",
                  (weekend || holiday) && !outside && "bg-ink/[0.025]",
                )}
              >
                <Link
                  href={`/panel/agenda/nuevo?fecha=${key}`}
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold sm:text-sm",
                    isToday
                      ? "bg-gold-600 text-navy-950"
                      : outside
                        ? "text-ink-muted/40"
                        : holiday
                          ? "text-danger-ink hover:bg-danger-soft"
                          : "text-ink-soft hover:bg-ink/5",
                  )}
                  aria-label={`Agendar el ${format(day, "d 'de' MMMM", { locale: es })}${holiday ? ` (inhábil: ${holiday})` : ""}`}
                >
                  {format(day, "d")}
                </Link>
                {holiday ? (
                  <p className="mt-0.5 hidden truncate px-1 text-[10px] font-medium text-danger-ink sm:block" title={holiday}>
                    {holiday}
                  </p>
                ) : null}
                {/* Móvil: puntos */}
                <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden">
                  {dayEvents.slice(0, 4).map((event) => (
                    <span key={event.id} className={cn("size-1.5 rounded-full", eventKindDot[event.kind])} />
                  ))}
                </div>
                {/* Escritorio: chips */}
                <ul className="mt-1 hidden space-y-0.5 sm:block">
                  {dayEvents.slice(0, 3).map((event) => (
                    <li key={event.id}>
                      <Link
                        href={`/panel/agenda/${event.id}`}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight text-ink hover:bg-ink/5",
                          event.status !== "pendiente" && "text-ink-muted/60 line-through",
                          (event.priority === "critica" || event.is_peremptory) && "bg-danger-soft font-semibold",
                        )}
                        title={event.title}
                      >
                        <span className={cn("size-1.5 shrink-0 rounded-full", eventKindDot[event.kind])} aria-hidden="true" />
                        {!event.all_day ? <span className="tabular-nums">{formatInZone(event.starts_at, "HH:mm")}</span> : null}
                        <span className="truncate">{event.title}</span>
                      </Link>
                    </li>
                  ))}
                  {dayEvents.length > 3 ? <li className="px-1.5 text-[11px] text-ink-muted">+{dayEvents.length - 3} más</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-5">
        <CardHeader title={`Eventos de ${format(monthDate, "MMMM", { locale: es })}`} description={`${monthEvents.length} en total`} />
        {monthEvents.length > 0 ? (
          <ul className="divide-y divide-ink/8" data-testid="month-events">
            {monthEvents.map((event) => (
              <li key={event.id}>
                <Link href={`/panel/agenda/${event.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-canvas">
                  <span className="w-12 shrink-0 text-center">
                    <span className="block text-[11px] font-semibold text-accent-ink uppercase">{formatInZone(event.starts_at, "EEE")}</span>
                    <span className="block font-serif text-2xl leading-none text-ink">{formatInZone(event.starts_at, "d")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-medium text-ink", event.status !== "pendiente" && "text-ink-muted line-through")}>
                        {event.title}
                      </span>
                      <Badge tone={eventKindTones[event.kind]}>{eventKindLabels[event.kind]}</Badge>
                      {event.priority === "critica" ? <Badge tone="red">Crítico</Badge> : null}
                      {event.is_peremptory ? <Badge tone="red">Perentorio</Badge> : null}
                    </span>
                    <span className="block truncate text-sm text-ink-muted">
                      {event.all_day ? "Todo el día" : `${formatInZone(event.starts_at, "HH:mm")} h`}
                      {event.matters ? ` · ${event.matters.title}` : ""}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CalendarDays aria-hidden="true" />} title="Sin eventos este mes" />
        )}
      </Card>
      </>
      )}
    </>
  );
}
