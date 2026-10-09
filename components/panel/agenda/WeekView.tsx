import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/panel/ui";
import { formatInZone, toDateOnly } from "@/lib/panel/dates";
import { eventKindDot, eventKindLabels, eventKindTones } from "@/lib/panel/labels";
import { DAY_END_HOUR, DAY_START_HOUR, layoutDay, minutePosition } from "@/lib/panel/week-layout";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type EventKind = Database["public"]["Enums"]["event_kind"];

export interface WeekEvent {
  id: string;
  title: string;
  kind: EventKind;
  priority: Database["public"]["Enums"]["event_priority"];
  status: Database["public"]["Enums"]["event_status"];
  is_peremptory: boolean;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  matters: { title: string } | null;
}

interface WeekViewProps {
  days: Date[];
  events: WeekEvent[];
  nonWorking: Map<string, string>;
  today: string;
  /** Minutos desde la medianoche ahora mismo (hora de Jujuy). */
  nowMinutes: number;
}

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, index) => DAY_START_HOUR + index);

function minutesOf(iso: string): number {
  const [hours, minutes] = formatInZone(iso, "HH:mm").split(":").map(Number);
  return hours * 60 + minutes;
}

function blockClasses(event: WeekEvent) {
  return cn(
    "absolute overflow-hidden rounded-lg border-l-[3px] bg-surface px-1.5 py-1 text-[11px] leading-tight shadow-sm ring-1 ring-ink/10 transition-[box-shadow,transform] hover:z-20 hover:shadow-md",
    event.status !== "pendiente" && "opacity-60",
    (event.priority === "critica" || event.is_peremptory) && "bg-danger-soft",
  );
}

const borderColor: Record<EventKind, string> = {
  audiencia: "border-l-sky-500",
  vencimiento: "border-l-red-500",
  reunion: "border-l-gold-600",
  tramite: "border-l-slate-500",
  escrito: "border-l-indigo-500",
  cedula: "border-l-teal-500",
  recordatorio: "border-l-amber-500",
};

export function WeekView({ days, events, nonWorking, today, nowMinutes }: WeekViewProps) {
  const byDay = days.map((day) => {
    const key = toDateOnly(day);
    const dayEvents = events.filter((event) => formatInZone(event.starts_at, "yyyy-MM-dd") === key);
    const timed = dayEvents.filter((event) => !event.all_day);
    return {
      day,
      key,
      allDay: dayEvents.filter((event) => event.all_day),
      timed,
      positioned: layoutDay(
        timed.map((event) => ({
          id: event.id,
          start: minutesOf(event.starts_at),
          end: event.ends_at ? minutesOf(event.ends_at) : minutesOf(event.starts_at) + 60,
        })),
      ),
    };
  });
  const nowTop = minutePosition(nowMinutes);

  return (
    <>
      {/* Escritorio: grilla horaria */}
      <div className="hidden overflow-hidden rounded-2xl border border-ink/8 bg-surface lg:block" data-testid="week-grid">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-ink/8 bg-canvas">
          <div />
          {byDay.map(({ day, key }) => {
            const holiday = nonWorking.get(key);
            return (
              <div key={key} className={cn("border-l border-ink/8 px-2 py-2 text-center", key === today && "bg-accent-soft")}>
                <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">{format(day, "EEE", { locale: es })}</p>
                <Link
                  href={`/panel/agenda/nuevo?fecha=${key}`}
                  className={cn(
                    "mx-auto mt-0.5 grid size-8 place-items-center rounded-full font-serif text-lg",
                    key === today ? "bg-gold-600 text-navy-950" : holiday ? "text-danger-ink" : "text-ink hover:bg-ink/5",
                  )}
                  aria-label={`Agendar el ${format(day, "d 'de' MMMM", { locale: es })}`}
                >
                  {format(day, "d")}
                </Link>
                {holiday ? <p className="mt-0.5 truncate text-[10px] font-medium text-danger-ink" title={holiday}>{holiday}</p> : null}
              </div>
            );
          })}
        </div>

        {byDay.some(({ allDay }) => allDay.length > 0) ? (
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-ink/8">
            <div className="px-1 py-1.5 text-right text-[10px] text-ink-muted">Todo el día</div>
            {byDay.map(({ key, allDay }) => (
              <div key={key} className="space-y-1 border-l border-ink/8 p-1">
                {allDay.map((event) => (
                  <Link
                    key={event.id}
                    href={`/panel/agenda/${event.id}`}
                    className={cn("flex items-center gap-1 truncate rounded-md bg-canvas px-1.5 py-0.5 text-[11px] text-ink ring-1 ring-ink/10", event.status !== "pendiente" && "line-through opacity-60")}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", eventKindDot[event.kind])} aria-hidden="true" />
                    <span className="truncate">{event.title}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="relative">
            {HOURS.map((hour) => (
              <div key={hour} className="h-14 pr-2 text-right text-[11px] text-ink-muted tabular-nums">
                <span className="-translate-y-2 inline-block">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>
          {byDay.map(({ key, timed, positioned }) => {
            const holiday = nonWorking.has(key);
            return (
              <div key={key} className={cn("relative border-l border-ink/8", holiday && "bg-danger-soft/40")} data-testid={`week-day-${key}`}>
                {HOURS.map((hour) => (
                  <Link
                    key={hour}
                    href={`/panel/agenda/nuevo?fecha=${key}&hora=${String(hour).padStart(2, "0")}:00`}
                    className="block h-14 border-b border-ink/6 transition-colors hover:bg-accent-soft/60"
                    aria-label={`Agendar el ${key} a las ${hour} h`}
                    tabIndex={-1}
                  />
                ))}
                {positioned.map((position) => {
                  const event = timed.find((item) => item.id === position.id)!;
                  return (
                    <Link
                      key={event.id}
                      href={`/panel/agenda/${event.id}`}
                      className={cn(blockClasses(event), borderColor[event.kind])}
                      style={{
                        top: `${position.top}%`,
                        height: `${position.height}%`,
                        left: `calc(${(position.lane / position.lanes) * 100}% + 2px)`,
                        width: `calc(${100 / position.lanes}% - 4px)`,
                      }}
                      title={`${event.title} · ${eventKindLabels[event.kind]}`}
                      data-testid="week-event"
                    >
                      <span className="block font-semibold text-ink tabular-nums">
                        {position.clippedStart ? "↑ " : ""}
                        {formatInZone(event.starts_at, "HH:mm")}
                      </span>
                      <span className={cn("block font-medium text-ink", event.status !== "pendiente" && "line-through")}>{event.title}</span>
                      {event.matters ? <span className="block truncate text-ink-muted">{event.matters.title}</span> : null}
                    </Link>
                  );
                })}
                {key === today && nowTop !== null ? (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: `${nowTop}%` }} aria-hidden="true">
                    <span className="-ml-1 size-2 rounded-full bg-red-500" />
                    <span className="h-px flex-1 bg-red-500" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Móvil: lista por día */}
      <ol className="space-y-3 lg:hidden" data-testid="week-list">
        {byDay.map(({ day, key, allDay, timed }) => {
          const dayEvents = [...allDay, ...timed];
          const holiday = nonWorking.get(key);
          return (
            <li key={key} className={cn("rounded-2xl border border-ink/8 bg-surface", key === today && "ring-2 ring-gold-600/40")}>
              <div className="flex items-center justify-between border-b border-ink/8 px-4 py-2.5">
                <p className="font-semibold text-ink capitalize">
                  {format(day, "EEEE d", { locale: es })}
                  {holiday ? <span className="ml-2 text-xs font-medium text-danger-ink normal-case">{holiday}</span> : null}
                </p>
                <Link href={`/panel/agenda/nuevo?fecha=${key}`} className="text-xs font-medium text-accent-ink">
                  + Agendar
                </Link>
              </div>
              {dayEvents.length > 0 ? (
                <ul className="divide-y divide-ink/8">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <Link href={`/panel/agenda/${event.id}`} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-12 shrink-0 text-sm font-semibold text-ink tabular-nums">
                          {event.all_day ? "Día" : formatInZone(event.starts_at, "HH:mm")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-medium text-ink", event.status !== "pendiente" && "line-through")}>{event.title}</span>
                          <span className="flex flex-wrap gap-1 pt-0.5">
                            <Badge tone={eventKindTones[event.kind]}>{eventKindLabels[event.kind]}</Badge>
                            {event.is_peremptory ? <Badge tone="red">Perentorio</Badge> : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-3 text-sm text-ink-muted/70">Sin eventos</p>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
