"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { saveScheduleItemAction } from "@/app/panel/honorarios/actions";
import { FEE_CATEGORIES, feeCategoryLabels } from "@/lib/panel/fees";

interface ScheduleItemFormProps {
  item?: {
    id: string;
    category: string;
    name: string;
    min_uma: number;
    max_uma: number | null;
    legal_reference: string | null;
  };
}

export function ScheduleItemForm({ item }: ScheduleItemFormProps) {
  const [state, formAction] = useActionState(saveScheduleItemAction.bind(null, item?.id ?? null), initialActionState);
  const prefix = item ? `item-${item.id}` : "item-nuevo";
  const errors = state.fieldErrors;

  return (
    <form action={formAction} noValidate className="space-y-3" data-testid={item ? "schedule-edit-form" : "schedule-new-form"}>
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label="Categoría" htmlFor={`${prefix}-category`} error={errors.category}>
          <Select id={`${prefix}-category`} name="category" defaultValue={item?.category ?? "otros"}>
            {FEE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {feeCategoryLabels[category]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Actividad" htmlFor={`${prefix}-name`} error={errors.name}>
          <Input id={`${prefix}-name`} name="name" defaultValue={item?.name ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_8rem_minmax(0,1fr)]">
        <Field label="Mínimo (UMA)" htmlFor={`${prefix}-min`} error={errors.min_uma}>
          <Input id={`${prefix}-min`} name="min_uma" inputMode="decimal" defaultValue={item?.min_uma ?? ""} />
        </Field>
        <Field label="Máximo (UMA)" htmlFor={`${prefix}-max`} error={errors.max_uma} hint="Opcional.">
          <Input id={`${prefix}-max`} name="max_uma" inputMode="decimal" defaultValue={item?.max_uma ?? ""} />
        </Field>
        <Field label="Referencia" htmlFor={`${prefix}-ref`} error={errors.legal_reference}>
          <Input id={`${prefix}-ref`} name="legal_reference" defaultValue={item?.legal_reference ?? ""} placeholder="Ej.: Ley 6368, art. 26" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm">
          <Save aria-hidden="true" />
          {item ? "Guardar cambios" : "Agregar al arancel"}
        </SubmitButton>
      </div>
    </form>
  );
}
