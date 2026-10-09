"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Calculator, Plus, TriangleAlert } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/panel/ui";
import { initialActionState, type ActionState } from "@/lib/actions";
import { createChargeAction } from "@/app/panel/honorarios/actions";
import { chargeKindLabels, feeCategoryLabels, PERCENTAGE_RULE, type FeeCategory } from "@/lib/panel/fees";
import { formatARS, formatUma, parseMoney, roundMoney } from "@/lib/panel/money";
import { cn } from "@/lib/utils";

interface ScheduleOption {
  id: string;
  category: string;
  name: string;
  minUma: number;
  maxUma: number | null;
  legalReference: string | null;
}

type Mode = "arancel" | "porcentaje" | "libre";

interface ChargeFormProps {
  matterId: string;
  today: string;
  uma: { value: number; effectiveFrom: string } | null;
  options: ScheduleOption[];
}

/** Formatea un número para el campo de monto ("892.576,00"). */
function toInput(value: number): string {
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function ChargeForm({ matterId, today, uma, options }: ChargeFormProps) {
  const [kind, setKind] = useState<"honorario" | "gasto">("honorario");
  const [mode, setMode] = useState<Mode>(uma && options.length > 0 ? "arancel" : "libre");
  const [itemId, setItemId] = useState("");
  const [umaQuantity, setUmaQuantity] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [percentage, setPercentage] = useState(String(PERCENTAGE_RULE.default));
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  // Tras un alta exitosa se limpian los campos (en la respuesta, no en un efecto).
  const [state, formAction] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await createChargeAction(previous, formData);
    if (result.ok) {
      formRef.current?.reset();
      setItemId("");
      setUmaQuantity("");
      setBaseAmount("");
      setConcept("");
      setAmount("");
    }
    return result;
  }, initialActionState);
  const errors = state.fieldErrors;


  const effectiveMode: Mode = kind === "gasto" ? "libre" : mode;
  const item = options.find((option) => option.id === itemId) ?? null;
  const quantity = Number(umaQuantity.replace(",", "."));
  const belowMinimum = item !== null && Number.isFinite(quantity) && quantity < item.minUma;
  const pct = Number(percentage.replace(",", "."));
  const outsideRange = Number.isFinite(pct) && (pct < PERCENTAGE_RULE.min || pct > PERCENTAGE_RULE.max);

  const grouped = useMemo(() => {
    const groups = new Map<string, ScheduleOption[]>();
    for (const option of options) groups.set(option.category, [...(groups.get(option.category) ?? []), option]);
    return [...groups.entries()];
  }, [options]);


  function selectItem(id: string) {
    setItemId(id);
    const selected = options.find((option) => option.id === id);
    if (!selected || !uma) return;
    setUmaQuantity(String(selected.minUma));
    setConcept(`${selected.name} (${formatUma(selected.minUma)})`);
    setAmount(toInput(roundMoney(selected.minUma * uma.value)));
  }

  function changeQuantity(value: string) {
    setUmaQuantity(value);
    const parsed = Number(value.replace(",", "."));
    if (item && uma && Number.isFinite(parsed) && parsed > 0) {
      setConcept(`${item.name} (${formatUma(parsed)})`);
      setAmount(toInput(roundMoney(parsed * uma.value)));
    }
  }

  function recalcPercentage(base: string, percent: string) {
    const parsedBase = parseMoney(base);
    const parsedPct = Number(percent.replace(",", "."));
    if (parsedBase && Number.isFinite(parsedPct) && parsedPct > 0) {
      setAmount(toInput(roundMoney((parsedBase * parsedPct) / 100)));
      setConcept(`Honorarios ${parsedPct}% s/ monto del proceso (${formatARS(parsedBase)})`);
    }
  }

  const modes: { id: Mode; label: string }[] = [
    { id: "arancel", label: "Desde el arancel" },
    { id: "porcentaje", label: "% del monto del juicio" },
    { id: "libre", label: "Monto libre" },
  ];

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4" data-testid="charge-form">
      <input type="hidden" name="matter_id" value={matterId} />
      <input type="hidden" name="schedule_item_id" value={effectiveMode === "arancel" ? itemId : ""} />
      <input type="hidden" name="uma_quantity" value={effectiveMode === "arancel" && item ? umaQuantity : ""} />
      <input type="hidden" name="uma_value" value={effectiveMode === "arancel" && item && uma ? String(uma.value) : ""} />
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />

      <div className="flex flex-wrap items-center gap-3">
        <Field label="Tipo" htmlFor="charge-kind" className="w-40">
          <Select id="charge-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as "honorario" | "gasto")}>
            {(Object.keys(chargeKindLabels) as (keyof typeof chargeKindLabels)[]).map((value) => (
              <option key={value} value={value}>
                {chargeKindLabels[value]}
              </option>
            ))}
          </Select>
        </Field>
        {kind === "honorario" ? (
          <div role="radiogroup" aria-label="Forma de cálculo" className="mt-6 flex flex-wrap gap-1 rounded-xl bg-ink/5 p-1">
            {modes.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mode === id}
                disabled={id === "arancel" && (!uma || options.length === 0)}
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40",
                  mode === id ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {effectiveMode === "arancel" && uma ? (
        <div className="space-y-3 rounded-2xl border border-gold-600/25 bg-accent-soft/60 p-4" data-testid="fee-calculator">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <Field label="Actividad del arancel" htmlFor="charge-item">
              <Select id="charge-item" value={itemId} onChange={(event) => selectItem(event.target.value)}>
                <option value="">Elegí una actividad</option>
                {grouped.map(([category, items]) => (
                  <optgroup key={category} label={feeCategoryLabels[category as FeeCategory] ?? category}>
                    {items.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} — {option.maxUma ? `${option.minUma} a ${option.maxUma}` : `mín. ${option.minUma}`} UMA
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Cantidad de UMA" htmlFor="charge-uma">
              <Input id="charge-uma" inputMode="decimal" value={umaQuantity} onChange={(event) => changeQuantity(event.target.value)} disabled={!item} />
            </Field>
          </div>
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Calculator className="size-4 shrink-0 text-accent-ink" aria-hidden="true" />
            UMA vigente: <strong>{formatARS(uma.value)}</strong>
            {item?.legalReference ? <span className="text-ink-muted">· {item.legalReference}</span> : null}
          </p>
          {belowMinimum ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-ink">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Por debajo del mínimo de referencia ({formatUma(item!.minUma)}). La ley no permite a los jueces regular por debajo de los
              mínimos (art. 17); en un convenio con el cliente rigen sus límites (arts. 4 y 5).
            </p>
          ) : null}
        </div>
      ) : null}

      {effectiveMode === "porcentaje" ? (
        <div className="space-y-3 rounded-2xl border border-gold-600/25 bg-accent-soft/60 p-4" data-testid="percentage-calculator">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Field label="Monto del proceso" htmlFor="charge-base" hint="Capital actualizado más intereses (art. 24).">
              <Input
                id="charge-base"
                inputMode="decimal"
                placeholder="Ej.: 5.000.000"
                value={baseAmount}
                onChange={(event) => {
                  setBaseAmount(event.target.value);
                  recalcPercentage(event.target.value, percentage);
                }}
              />
            </Field>
            <Field label="Porcentaje" htmlFor="charge-pct" hint="20% (15 a 25%).">
              <Input
                id="charge-pct"
                inputMode="decimal"
                value={percentage}
                onChange={(event) => {
                  setPercentage(event.target.value);
                  recalcPercentage(baseAmount, event.target.value);
                }}
              />
            </Field>
          </div>
          {outsideRange ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-ink">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Fuera del rango del art. 23 de la Ley 6368 (15% a 25%).
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field label="Concepto" htmlFor="charge-concept" error={errors.concept} required>
          <Input
            id="charge-concept"
            name="concept"
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            placeholder={kind === "gasto" ? "Ej.: Tasa de justicia" : "Ej.: Honorarios por divorcio"}
            aria-invalid={errors.concept ? true : undefined}
          />
        </Field>
        <Field label="Monto ($)" htmlFor="charge-amount" error={errors.amount} required>
          <Input
            id="charge-amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            aria-invalid={errors.amount ? true : undefined}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="charge-date" error={errors.charged_on}>
          <Input id="charge-date" name="charged_on" type="date" defaultValue={today} />
        </Field>
        <Field label="Vencimiento del pago" htmlFor="charge-due" error={errors.due_on} hint="Opcional.">
          <Input id="charge-due" name="due_on" type="date" />
        </Field>
      </div>

      <Field label="Notas" htmlFor="charge-notes" error={errors.notes}>
        <Textarea id="charge-notes" name="notes" rows={2} placeholder="Ej.: pagadero en 3 cuotas según convenio firmado." />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Registrando…">
          <Plus aria-hidden="true" />
          Registrar {kind === "honorario" ? "honorario" : "gasto"}
        </SubmitButton>
      </div>
    </form>
  );
}
