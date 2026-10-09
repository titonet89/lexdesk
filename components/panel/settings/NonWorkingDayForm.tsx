"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { nonWorkingDayKindLabels, toOptions } from "@/lib/panel/labels";
import { addNonWorkingDaysAction } from "@/app/panel/ajustes/actions";

export function NonWorkingDayForm() {
  const [state, formAction] = useActionState(addNonWorkingDaysAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4" data-testid="non-working-form">
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde" htmlFor="nw-from" error={errors.from} required>
          <Input id="nw-from" name="from" type="date" />
        </Field>
        <Field label="Hasta" htmlFor="nw-to" error={errors.to} hint="Solo para rangos (ferias).">
          <Input id="nw-to" name="to" type="date" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field label="Tipo" htmlFor="nw-kind" error={errors.kind}>
          <Select id="nw-kind" name="kind" defaultValue="feriado">
            {toOptions(nonWorkingDayKindLabels).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="nw-description" error={errors.description} required>
          <Input id="nw-description" name="description" placeholder="Ej.: Día de la Independencia" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Agregando…">
          <Plus aria-hidden="true" />
          Agregar
        </SubmitButton>
      </div>
    </form>
  );
}
