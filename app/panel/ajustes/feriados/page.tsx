import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarOff, Info, Trash } from "lucide-react";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { NonWorkingDayForm } from "@/components/panel/settings/NonWorkingDayForm";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly, todayIso } from "@/lib/panel/dates";
import { nonWorkingDayKindLabels } from "@/lib/panel/labels";
import { createClient } from "@/lib/supabase/server";
import { deleteNonWorkingDayAction } from "../actions";

export const metadata: Metadata = { title: "Feriados" };

export default async function NonWorkingDaysPage() {
  const { active: organization } = await requireTitular();
  const supabase = await createClient();
  const { data: days } = await supabase
    .from("non_working_days")
    .select("day, kind, description")
    .eq("organization_id", organization.organizationId)
    .gte("day", `${todayIso().slice(0, 4)}-01-01`)
    .order("day");

  return (
    <>
      <PageHeader
        title="Feriados y ferias judiciales"
        description="Estos días se saltean al calcular vencimientos en días hábiles."
        eyebrow={
          <Link href="/panel/ajustes" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ajustes
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={`Días inhábiles desde ${todayIso().slice(0, 4)}`} description={`${days?.length ?? 0} cargados`} />
          {days && days.length > 0 ? (
            <ul className="divide-y divide-ink/8" data-testid="non-working-list">
              {days.map((day) => (
                <li key={day.day} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-28 shrink-0 text-sm font-semibold text-ink capitalize">
                    {formatDateOnly(day.day, "EEE d MMM yyyy")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{day.description}</span>
                  <Badge tone={day.kind === "feria_judicial" ? "gold" : "neutral"}>{nonWorkingDayKindLabels[day.kind]}</Badge>
                  <ConfirmActionButton
                    action={deleteNonWorkingDayAction.bind(null, day.day)}
                    title="¿Quitar este día inhábil?"
                    description="Los próximos cálculos de plazo lo contarán como hábil."
                    confirmLabel="Quitar"
                    ariaLabel={`Quitar ${day.description}`}
                  >
                    <Trash className="size-4" aria-hidden="true" />
                  </ConfirmActionButton>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarOff aria-hidden="true" />} title="Todavía no cargaste días inhábiles" />
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-4 font-serif text-lg text-ink">Agregar</h2>
            <NonWorkingDayForm />
          </Card>
          <Card className="p-5 text-sm text-ink-soft">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Info className="size-4.5 text-accent-ink" aria-hidden="true" />
              Fuentes oficiales
            </p>
            <p className="mt-2">
              Cargá los feriados nacionales del calendario oficial y las ferias judiciales y asuetos que disponga el
              Superior Tribunal de Justicia de Jujuy por acordada. Los sábados y domingos ya se excluyen solos.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
