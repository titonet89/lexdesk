"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Card, Field, FormMessage, Input, Select, Textarea } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/actions";
import { clientKindLabels, documentTypeLabels, toOptions } from "@/lib/panel/labels";
import type { Database } from "@/lib/supabase/database.types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

interface ClientFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  client?: ClientRow;
  cancelHref: string;
}

export function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;
  const invalid = (field: string) => (errors[field] ? true : undefined);

  return (
    <form action={formAction} noValidate>
      <Card className="space-y-5 p-5 sm:p-6">
        <FormMessage message={state.ok ? null : state.message} />

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field label="Tipo" htmlFor="kind" error={errors.kind}>
            <Select id="kind" name="kind" defaultValue={client?.kind ?? "persona"}>
              {toOptions(clientKindLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre y apellido / Razón social" htmlFor="full_name" error={errors.full_name} required>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={client?.full_name ?? ""}
              required
              autoComplete="off"
              aria-invalid={invalid("full_name")}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Field label="Documento" htmlFor="document_type" error={errors.document_type}>
            <Select id="document_type" name="document_type" defaultValue={client?.document_type ?? ""}>
              <option value="">—</option>
              {toOptions(documentTypeLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Número" htmlFor="document_number" error={errors.document_number}>
            <Input
              id="document_number"
              name="document_number"
              defaultValue={client?.document_number ?? ""}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={invalid("document_number")}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Teléfono / WhatsApp" htmlFor="phone" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={client?.phone ?? ""} aria-invalid={invalid("phone")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} aria-invalid={invalid("email")} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Domicilio" htmlFor="address" error={errors.address}>
            <Input id="address" name="address" defaultValue={client?.address ?? ""} aria-invalid={invalid("address")} />
          </Field>
          <Field label="Localidad" htmlFor="locality" error={errors.locality}>
            <Input id="locality" name="locality" defaultValue={client?.locality ?? ""} aria-invalid={invalid("locality")} />
          </Field>
        </div>

        <Field label="Notas internas" htmlFor="notes" error={errors.notes} hint="Solo visibles para vos.">
          <Textarea id="notes" name="notes" rows={4} defaultValue={client?.notes ?? ""} aria-invalid={invalid("notes")} />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-navy-900/8 pt-5 sm:flex-row sm:justify-end">
          <Link href={cancelHref} className={buttonClasses("ghost", "md")}>
            Cancelar
          </Link>
          <SubmitButton>
            <Save aria-hidden="true" />
            Guardar cliente
          </SubmitButton>
        </div>
      </Card>
    </form>
  );
}
