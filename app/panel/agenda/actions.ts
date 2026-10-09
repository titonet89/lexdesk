"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addHours } from "date-fns";
import { actionError, formText, GENERIC_ERROR, zodFieldErrors, type ActionState } from "@/lib/actions";
import { getTitularOrNull } from "@/lib/auth/session";
import { zonedInputToIso } from "@/lib/panel/dates";
import { eventSchema, uuidSchema } from "@/lib/panel/schemas";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventStatus = Database["public"]["Enums"]["event_status"];

function parseEvent(formData: FormData) {
  return eventSchema.safeParse({
    matter_id: formText(formData, "matter_id"),
    title: formText(formData, "title"),
    kind: formText(formData, "kind"),
    priority: formText(formData, "priority"),
    date: formText(formData, "date"),
    all_day: formData.get("all_day") === "on",
    start_time: formText(formData, "start_time"),
    end_time: formText(formData, "end_time"),
    location: formText(formData, "location"),
    notes: formText(formData, "notes"),
    deadline_from: formText(formData, "deadline_from"),
    deadline_business_days: formText(formData, "deadline_business_days"),
  });
}

function toRow(data: NonNullable<ReturnType<typeof parseEvent>["data"]>): Omit<EventInsert, "organization_id"> {
  const startsAt = data.all_day ? zonedInputToIso(data.date, "00:00") : zonedInputToIso(data.date, data.start_time);
  const endsAt = data.all_day
    ? null
    : data.end_time
      ? zonedInputToIso(data.date, data.end_time)
      : addHours(new Date(startsAt), 1).toISOString();

  return {
    matter_id: data.matter_id,
    title: data.title,
    kind: data.kind,
    priority: data.priority,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: data.all_day,
    location: data.location,
    notes: data.notes,
    deadline_from: data.deadline_business_days ? data.deadline_from : null,
    deadline_business_days: data.deadline_from ? data.deadline_business_days : null,
  };
}

function revalidateAgenda(matterId?: string | null) {
  revalidatePath("/panel/agenda");
  revalidatePath("/panel");
  if (matterId) revalidatePath(`/panel/expedientes/${matterId}`);
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getTitularOrNull();
  if (!session) return actionError("No autorizado.");
  const parsed = parseEvent(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const row = toRow(parsed.data);
  const { data, error } = await supabase.from("events").insert({ ...row, organization_id: session.active.organizationId }).select("id").single();
  if (error || !data) return actionError(GENERIC_ERROR);

  revalidateAgenda(row.matter_id);
  redirect(`/panel/agenda/${data.id}`);
}

export async function updateEventAction(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  if (!uuidSchema.safeParse(eventId).success) return actionError("Evento inválido.");
  const parsed = parseEvent(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const row = toRow(parsed.data);
  const { error } = await supabase.from("events").update(row).eq("id", eventId);
  if (error) return actionError(GENERIC_ERROR);

  revalidateAgenda(row.matter_id);
  revalidatePath(`/panel/agenda/${eventId}`);
  redirect(`/panel/agenda/${eventId}`);
}

export async function setEventStatusAction(eventId: string, status: EventStatus): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(eventId).success) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .update({ status, completed_at: status === "cumplido" ? new Date().toISOString() : null })
    .eq("id", eventId)
    .select("matter_id")
    .maybeSingle();

  revalidateAgenda(data?.matter_id);
  revalidatePath(`/panel/agenda/${eventId}`);
}

export async function deleteEventAction(eventId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(eventId).success) return;

  const supabase = await createClient();
  const { data } = await supabase.from("events").delete().eq("id", eventId).select("matter_id").maybeSingle();
  revalidateAgenda(data?.matter_id);
  redirect("/panel/agenda");
}
