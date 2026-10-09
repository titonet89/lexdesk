"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { addUmaValueAction } from "@/app/panel/honorarios/actions";

export function UmaForm({ today }: { today: string }) {
  const [state, formAction] = useActionState(addUmaValueAction, initialActionState);
  return (
    <form action={formAction} noValidate className="space-y-3" data-testid="uma-form">
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nuevo valor ($)" htmlFor="uma-value" error={state.fieldErrors.value}>
          <Input id="uma-value" name="value" inputMode="decimal" placeholder="Ej.: 55.786" />
        </Field>
        <Field label="Vigente desde" htmlFor="uma-from" error={state.fieldErrors.effective_from}>
          <Input id="uma-from" name="effective_from" type="date" defaultValue={today} />
        </Field>
      </div>
      <Field label="Fuente" htmlFor="uma-note" error={state.fieldErrors.note}>
        <Input id="uma-note" name="note" placeholder="Ej.: Resolución del Colegio publicada en el Boletín Oficial" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>
          <Save aria-hidden="true" />
          Guardar valor
        </SubmitButton>
      </div>
    </form>
  );
}
