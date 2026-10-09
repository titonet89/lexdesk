import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, Pencil, Power, RotateCcw } from "lucide-react";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { ScheduleItemForm } from "@/components/panel/fees/ScheduleItemForm";
import { UmaForm } from "@/components/panel/fees/UmaForm";
import { Badge, Card, CardHeader, PageHeader } from "@/components/panel/ui";
import { restoreScheduleAction, toggleScheduleItemAction } from "@/app/panel/honorarios/actions";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly, todayIso } from "@/lib/panel/dates";
import { FEE_CATEGORIES, feeCategoryLabels } from "@/lib/panel/fees";
import { getCurrentUma } from "@/lib/panel/fees-data";
import { formatARS, formatUma, roundMoney } from "@/lib/panel/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Arancel y UMA" };

/** Publicación oficial de los valores de la UMA y de los mínimos sugeridos. */
const COLEGIO_URL = "https://colabogadosjujuy.com.ar/novedades/honorarios-actualizados-nuevos-valores-para-la-consulta-minima-sugerida/";

export default async function FeeSettingsPage() {
  const { active: organization } = await requireTitular();
  const supabase = await createClient();
  const [uma, { data: history }, { data: items }] = await Promise.all([
    getCurrentUma(organization.organizationId),
    supabase
      .from("uma_values")
      .select("id, value, effective_from, note")
      .eq("organization_id", organization.organizationId)
      .order("effective_from", { ascending: false })
      .limit(12),
    supabase
      .from("fee_schedule_items")
      .select("*")
      .eq("organization_id", organization.organizationId)
      .order("sort_order"),
  ]);

  const byCategory = FEE_CATEGORIES.map((category) => ({
    category,
    items: (items ?? []).filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title="Arancel y UMA"
        description="Valores de referencia del estudio para calcular honorarios. Todo es editable."
        eyebrow={
          <Link href="/panel/ajustes" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ajustes
          </Link>
        }
      />

      <Card className="mb-5 p-5 text-sm text-ink-soft">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <BookOpen className="size-4.5 text-accent-ink" aria-hidden="true" />
          Marco de referencia: Ley 6368 de Honorarios de Abogados y Procuradores de Jujuy
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>La UMA equivale al 0,5% del sueldo básico de un juez de la Corte Suprema de la Nación; la actualiza el Colegio (art. 20).</li>
          <li>En procesos con monto, el honorario es del 20% del monto del juicio; excepcionalmente entre el 15% y el 25% (art. 23).</li>
          <li>Los mínimos del arancel son obligatorios para la regulación judicial (art. 17); con el cliente se puede pactar por convenio escrito (art. 4).</li>
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          Valores precargados como referencia. Verificá siempre la UMA vigente publicada por el Colegio de Abogados y Procuradores de Jujuy.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="UMA vigente" />
            <div className="space-y-4 p-5">
              {uma ? (
                <div>
                  <p className="font-serif text-4xl text-ink tabular-nums" data-testid="uma-current">
                    {formatARS(uma.value)}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    Desde el {formatDateOnly(uma.effectiveFrom)}
                    {uma.note ? ` · ${uma.note}` : ""}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Todavía no cargaste el valor de la UMA.</p>
              )}
              <a href={COLEGIO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline">
                Ver valores publicados por el Colegio
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              <div className="border-t border-ink/8 pt-4">
                <UmaForm today={todayIso()} />
              </div>
            </div>
          </Card>

          {history && history.length > 0 ? (
            <Card>
              <CardHeader title="Historial de la UMA" />
              <ul className="divide-y divide-ink/8" data-testid="uma-history">
                {history.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="text-ink-muted">{formatDateOnly(row.effective_from, "d MMM yyyy")}</span>
                    <span className="font-medium text-ink tabular-nums">{formatARS(Number(row.value))}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          {byCategory.map(({ category, items: groupItems }) => (
            <Card key={category}>
              <CardHeader title={feeCategoryLabels[category]} />
              <ul className="divide-y divide-ink/8">
                {groupItems.map((item) => {
                  const min = Number(item.min_uma);
                  const max = item.max_uma === null ? null : Number(item.max_uma);
                  return (
                    <li key={item.id} className={cn("px-5 py-3", !item.is_active && "opacity-50")} data-testid="schedule-item">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-ink">{item.name}</span>
                          <span className="block text-xs text-ink-muted">{item.legal_reference ?? "Sin referencia"}</span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-semibold text-ink tabular-nums">
                            {max ? `${formatUma(min).replace(" UMA", "")} a ${formatUma(max)}` : formatUma(min)}
                          </span>
                          {uma ? (
                            <span className="block text-xs text-ink-muted tabular-nums">
                              {max ? `${formatARS(roundMoney(min * uma.value))} a ${formatARS(roundMoney(max * uma.value))}` : formatARS(roundMoney(min * uma.value))}
                            </span>
                          ) : null}
                        </span>
                        {!item.is_active ? <Badge>Inactivo</Badge> : null}
                        <form action={toggleScheduleItemAction.bind(null, item.id, !item.is_active)}>
                          <button
                            type="submit"
                            className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink"
                            aria-label={item.is_active ? `Desactivar ${item.name}` : `Activar ${item.name}`}
                            title={item.is_active ? "Desactivar" : "Activar"}
                          >
                            <Power className="size-4" aria-hidden="true" />
                          </button>
                        </form>
                      </div>
                      <details className="mt-2">
                        <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-accent-ink hover:underline">
                          <Pencil className="size-3" aria-hidden="true" />
                          Editar
                        </summary>
                        <div className="mt-3 rounded-xl bg-canvas p-3">
                          <ScheduleItemForm
                            item={{ id: item.id, category: item.category, name: item.name, min_uma: min, max_uma: max, legal_reference: item.legal_reference }}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}

          <Card>
            <CardHeader title="Agregar una actividad al arancel" />
            <div className="p-5">
              <ScheduleItemForm />
            </div>
          </Card>

          <div className="text-right">
            <ConfirmActionButton
              action={restoreScheduleAction}
              title="¿Restaurar el arancel de la Ley 6368?"
              description="Se reemplazan todas las actividades por los valores de referencia originales. Los honorarios ya cargados no cambian."
              confirmLabel="Restaurar"
              className="rounded-full border border-ink/15 px-4 py-2"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Restaurar valores de la ley
            </ConfirmActionButton>
          </div>
        </div>
      </div>
    </>
  );
}
