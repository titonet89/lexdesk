"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { sharePermissionLabels, toOptions } from "@/lib/panel/labels";
import { createShareAction } from "@/app/panel/expedientes/actions";

interface ShareFormProps {
  matterId: string;
  collaborators: { id: string; full_name: string; email: string }[];
  minDate: string;
}

export function ShareForm({ matterId, collaborators, minDate }: ShareFormProps) {
  const [state, formAction] = useActionState(createShareAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4" data-testid="share-form">
      <input type="hidden" name="matter_id" value={matterId} />
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Colaborador/a" htmlFor="share-collaborator" error={errors.collaborator_id} required>
          <Select id="share-collaborator" name="collaborator_id" defaultValue="">
            <option value="" disabled>
              Elegí un colaborador
            </option>
            {collaborators.map((collaborator) => (
              <option key={collaborator.id} value={collaborator.id}>
                {collaborator.full_name || collaborator.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Permiso" htmlFor="share-permission" error={errors.permission}>
          <Select id="share-permission" name="permission" defaultValue="comentario">
            {toOptions(sharePermissionLabels).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <Field label="Acceso hasta" htmlFor="share-expires" error={errors.expires_on} hint="Opcional. Recomendado.">
          <Input id="share-expires" name="expires_on" type="date" min={minDate} />
        </Field>
        <label className="flex h-11 cursor-pointer items-center gap-3 text-sm text-ink-soft">
          <input type="checkbox" name="include_documents" className="size-5 accent-gold-600" />
          Incluir documentos
        </label>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Compartiendo…">
          <Send aria-hidden="true" />
          Compartir expediente
        </SubmitButton>
      </div>
    </form>
  );
}
