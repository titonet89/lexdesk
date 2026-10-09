"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { updateProfileAction } from "@/app/panel/ajustes/actions";

export function ProfileForm({ fullName, registration, email }: { fullName: string; registration: string; email: string }) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);
  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <Field label="Email" htmlFor="profile-email" hint="Para cambiarlo, contactá al soporte técnico.">
        <Input id="profile-email" value={email} disabled readOnly />
      </Field>
      <Field label="Nombre para mostrar" htmlFor="profile-name" error={state.fieldErrors.full_name}>
        <Input id="profile-name" name="full_name" defaultValue={fullName} />
      </Field>
      <Field label="Matrícula" htmlFor="profile-registration" error={state.fieldErrors.professional_registration}>
        <Input id="profile-registration" name="professional_registration" defaultValue={registration} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>
          <Save aria-hidden="true" />
          Guardar
        </SubmitButton>
      </div>
    </form>
  );
}
