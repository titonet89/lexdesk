import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/panel/agenda/EventForm";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { todayIso } from "@/lib/panel/dates";
import { uuidSchema } from "@/lib/panel/schemas";
import { createEventAction } from "../actions";
import { loadEventFormData } from "../data";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function NewEventPage({ searchParams }: PageProps<"/panel/agenda/nuevo">) {
  const { active: organization } = await requireTitular();
  const { expediente, fecha } = await searchParams;
  const matterId = typeof expediente === "string" && uuidSchema.safeParse(expediente).success ? expediente : "";
  const date = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : todayIso();

  const { matters, nonWorkingDays } = await loadEventFormData(organization.organizationId);

  return (
    <>
      <PageHeader
        title="Nuevo evento"
        eyebrow={
          <Link href={matterId ? `/panel/expedientes/${matterId}?seccion=agenda` : "/panel/agenda"} className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {matterId ? "Expediente" : "Agenda"}
          </Link>
        }
      />
      <EventForm
        action={createEventAction}
        matters={matters}
        nonWorkingDays={nonWorkingDays}
        cancelHref={matterId ? `/panel/expedientes/${matterId}?seccion=agenda` : "/panel/agenda"}
        submitLabel="Guardar evento"
        defaults={{
          matter_id: matterId,
          title: "",
          kind: "vencimiento",
          priority: "normal",
          date,
          all_day: false,
          start_time: "09:00",
          end_time: "",
          location: "",
          notes: "",
          deadline_from: todayIso(),
          deadline_business_days: "",
        }}
      />
    </>
  );
}
