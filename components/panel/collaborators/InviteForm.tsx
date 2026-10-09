"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { inviteCollaboratorAction } from "@/app/panel/colaboradores/actions";

export function InviteForm() {
  const [state, formAction] = useActionState(inviteCollaboratorAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4" data-testid="invite-form">
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <Field label="Nombre y apellido" htmlFor="invite-name" error={errors.full_name} required>
        <Input id="invite-name" name="full_name" placeholder="Ej.: Dr. Juan Pérez" aria-invalid={errors.full_name ? true : undefined} />
      </Field>
      <Field label="Email" htmlFor="invite-email" error={errors.email} required>
        <Input id="invite-email" name="email" type="email" aria-invalid={errors.email ? true : undefined} />
      </Field>
      <SubmitButton pendingLabel="Enviando…" className="w-full">
        <UserPlus aria-hidden="true" />
        Enviar invitación
      </SubmitButton>
    </form>
  );
}
