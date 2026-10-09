import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/panel/agenda/EventForm";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { isoToZonedInput } from "@/lib/panel/dates";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { updateEventAction } from "../../actions";
import { loadEventFormData } from "../../data";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditEventPage({ params }: PageProps<"/panel/agenda/[id]/editar">) {
  const { active: organization } = await requireTitular();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: event }, { matters, nonWorkingDays }] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    loadEventFormData(organization.organizationId),
  ]);
  if (!event) notFound();

  const start = isoToZonedInput(event.starts_at);
  const end = event.ends_at ? isoToZonedInput(event.ends_at) : null;
  // Un evento puede estar vinculado a un expediente ya cerrado: lo agregamos a la lista.
  const matterOptions =
    event.matter_id && !matters.some((matter) => matter.id === event.matter_id)
      ? [...matters, { id: event.matter_id, title: "Expediente vinculado (cerrado)" }]
      : matters;

  return (
    <>
      <PageHeader
        title="Editar evento"
        eyebrow={
          <Link href={`/panel/agenda/${id}`} className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {event.title}
          </Link>
        }
      />
      <EventForm
        action={updateEventAction.bind(null, id)}
        matters={matterOptions}
        nonWorkingDays={nonWorkingDays}
        cancelHref={`/panel/agenda/${id}`}
        submitLabel="Guardar cambios"
        defaults={{
          matter_id: event.matter_id ?? "",
          title: event.title,
          kind: event.kind,
          priority: event.priority,
          date: start.date,
          all_day: event.all_day,
          start_time: event.all_day ? "09:00" : start.time,
          end_time: end && !event.all_day ? end.time : "",
          location: event.location ?? "",
          notes: event.notes ?? "",
          deadline_from: event.deadline_from ?? "",
          deadline_business_days: event.deadline_business_days ? String(event.deadline_business_days) : "",
        }}
      />
    </>
  );
}
