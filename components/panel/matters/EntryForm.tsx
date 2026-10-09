"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { entryKindLabels, toOptions } from "@/lib/panel/labels";
import { addEntryAction } from "@/app/panel/expedientes/actions";

export function EntryForm({ matterId, today }: { matterId: string; today: string }) {
  const [state, formAction] = useActionState(addEntryAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4" data-testid="entry-form">
      <input type="hidden" name="matter_id" value={matterId} />
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-4 sm:grid-cols-[10rem_12rem_1fr]">
        <Field label="Fecha" htmlFor="entry-date" error={errors.occurred_on}>
          <Input id="entry-date" name="occurred_on" type="date" defaultValue={today} />
        </Field>
        <Field label="Tipo" htmlFor="entry-kind" error={errors.kind}>
          <Select id="entry-kind" name="kind" defaultValue="escrito">
            {toOptions(entryKindLabels).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Resumen" htmlFor="entry-summary" error={errors.summary} required>
          <Input id="entry-summary" name="summary" placeholder="Ej.: Se presentó contestación de demanda" aria-invalid={errors.summary ? true : undefined} />
        </Field>
      </div>
      <Field label="Detalle" htmlFor="entry-details" error={errors.details}>
        <Textarea id="entry-details" name="details" rows={3} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Registrando…">
          <Plus aria-hidden="true" />
          Registrar actuación
        </SubmitButton>
      </div>
    </form>
  );
}
