import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Calculator, CircleCheck, Clock, FolderOpen, MapPin, Pencil, RotateCcw, Trash } from "lucide-react";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { Badge, Card, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly, formatInZone, relativeDayLabel } from "@/lib/panel/dates";
import { eventKindLabels, eventKindTones, eventPriorityLabels, eventStatusLabels } from "@/lib/panel/labels";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { deleteEventAction, setEventStatusAction } from "../actions";

export const metadata: Metadata = { title: "Evento" };

export default async function EventDetailPage({ params }: PageProps<"/panel/agenda/[id]">) {
  await requireTitular();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*, matters(id, title)").eq("id", id).maybeSingle();
  if (!event) notFound();

  const pending = event.status === "pendiente";
  const overdue = pending && new Date(event.starts_at) < new Date() && event.kind !== "recordatorio";

  return (
    <>
      <PageHeader
        title={event.title}
        eyebrow={
          <Link href="/panel/agenda" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Agenda
          </Link>
        }
        actions={
          <Link href={`/panel/agenda/${id}/editar`} className={buttonClasses("ghost", "md", "border border-ink/15")}>
            <Pencil aria-hidden="true" />
            Editar
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={eventKindTones[event.kind]}>{eventKindLabels[event.kind]}</Badge>
        <Badge tone={event.priority === "critica" ? "red" : event.priority === "alta" ? "amber" : "neutral"}>
          Prioridad {eventPriorityLabels[event.priority].toLowerCase()}
        </Badge>
        <Badge tone={event.status === "cumplido" ? "green" : event.status === "cancelado" ? "neutral" : "blue"}>
          {eventStatusLabels[event.status]}
        </Badge>
        {overdue ? <Badge tone="red">Fecha vencida</Badge> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="space-y-4 p-5 sm:p-6">
          <p className="flex items-start gap-3 text-ink">
            <Clock className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
            <span>
              <span className="block font-semibold capitalize">
                {formatInZone(event.starts_at, "EEEE d 'de' MMMM 'de' yyyy")}
              </span>
              <span className="text-sm text-ink-muted">
                {event.all_day
                  ? "Todo el día"
                  : `${formatInZone(event.starts_at, "HH:mm")}${event.ends_at ? ` a ${formatInZone(event.ends_at, "HH:mm")}` : ""} h`}{" "}
                · {relativeDayLabel(event.starts_at)}
              </span>
            </span>
          </p>
          {event.location ? (
            <p className="flex items-start gap-3 text-ink">
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
              {event.location}
            </p>
          ) : null}
          {event.matters ? (
            <p className="flex items-start gap-3">
              <FolderOpen className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
              <Link href={`/panel/expedientes/${event.matters.id}`} className="font-medium text-accent-ink hover:underline">
                {event.matters.title}
              </Link>
            </p>
          ) : null}
          {event.deadline_from && event.deadline_business_days ? (
            <p className="flex items-start gap-3 text-sm text-ink-soft">
              <Calculator className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden="true" />
              Plazo de {event.deadline_business_days} días hábiles desde la notificación del{" "}
              {formatDateOnly(event.deadline_from, "d 'de' MMMM 'de' yyyy")}.
            </p>
          ) : null}
          {event.notes ? (
            <div className="border-t border-ink/8 pt-4">
              <p className="text-xs font-semibold tracking-wide text-ink-muted/70 uppercase">Notas</p>
              <p className="mt-1 whitespace-pre-line text-ink-soft">{event.notes}</p>
            </div>
          ) : null}
        </Card>

        <Card className="h-fit space-y-2 p-5">
          {pending ? (
            <>
              <form action={setEventStatusAction.bind(null, id, "cumplido")}>
                <button type="submit" className={buttonClasses("primary", "md", "w-full")}>
                  <CircleCheck aria-hidden="true" />
                  Marcar como cumplido
                </button>
              </form>
              <form action={setEventStatusAction.bind(null, id, "cancelado")}>
                <button type="submit" className={buttonClasses("ghost", "md", "w-full border border-ink/15")}>
                  <Ban aria-hidden="true" />
                  Cancelar evento
                </button>
              </form>
            </>
          ) : (
            <form action={setEventStatusAction.bind(null, id, "pendiente")}>
              <button type="submit" className={buttonClasses("ghost", "md", "w-full border border-ink/15")}>
                <RotateCcw aria-hidden="true" />
                Volver a pendiente
              </button>
            </form>
          )}
          <div className="border-t border-ink/8 pt-3 text-center">
            <ConfirmActionButton
              action={deleteEventAction.bind(null, id)}
              title="¿Eliminar este evento?"
              description="Se borrará de la agenda. La eliminación queda registrada."
              confirmLabel="Eliminar"
            >
              <Trash className="size-4" aria-hidden="true" />
              Eliminar evento
            </ConfirmActionButton>
          </div>
        </Card>
      </div>
    </>
  );
}
