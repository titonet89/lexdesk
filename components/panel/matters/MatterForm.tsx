"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save, ShieldAlert } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Card, Field, FormMessage, Input, Select, Textarea } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/actions";
import { forumSuggestions, matterStatusLabels, practiceAreaLabels, stageLabels, toOptions } from "@/lib/panel/labels";
import type { Database } from "@/lib/supabase/database.types";

type MatterRow = Database["public"]["Tables"]["matters"]["Row"];

interface MatterFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  clients: { id: string; full_name: string }[];
  matter?: MatterRow;
  defaultClientId?: string;
  today: string;
  cancelHref: string;
}

export function MatterForm({ action, clients, matter, defaultClientId, today, cancelHref }: MatterFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;
  const invalid = (field: string) => (errors[field] ? true : undefined);

  return (
    <form action={formAction} noValidate>
      <Card className="space-y-5 p-5 sm:p-6">
        <FormMessage message={state.ok ? null : state.message} />

        <Field label="Cliente" htmlFor="client_id" error={errors.client_id} required>
          <Select
            id="client_id"
            name="client_id"
            defaultValue={matter?.client_id ?? defaultClientId ?? ""}
            aria-invalid={invalid("client_id")}
          >
            <option value="" disabled>
              Elegí un cliente
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Carátula"
          htmlFor="title"
          error={errors.title}
          hint="Ej.: Pérez, Juan c/ Gómez, Ana s/ alimentos"
          required
        >
          <Input id="title" name="title" defaultValue={matter?.title ?? ""} aria-invalid={invalid("title")} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Área" htmlFor="area" error={errors.area} required>
            <Select id="area" name="area" defaultValue={matter?.area ?? "familia"}>
              {toOptions(practiceAreaLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="status" error={errors.status} required hint="Situación administrativa.">
            <Select id="status" name="status" defaultValue={matter?.status ?? "consulta"}>
              {toOptions(matterStatusLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Etapa procesal" htmlFor="stage" error={errors.stage} required>
            <Select id="stage" name="stage" defaultValue={matter?.stage ?? "iniciacion"}>
              {toOptions(stageLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <fieldset className="space-y-5 rounded-2xl border border-ink/8 p-4 sm:p-5">
          <legend className="px-1 text-sm font-semibold text-ink">Datos del expediente judicial</legend>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)]">
            <Field label="N.º de expediente" htmlFor="file_number" error={errors.file_number}>
              <Input id="file_number" name="file_number" defaultValue={matter?.file_number ?? ""} aria-invalid={invalid("file_number")} />
            </Field>
            <Field label="Año" htmlFor="file_year" error={errors.file_year}>
              <Input
                id="file_year"
                name="file_year"
                inputMode="numeric"
                maxLength={4}
                placeholder={today.slice(0, 4)}
                defaultValue={matter?.file_year ?? ""}
                aria-invalid={invalid("file_year")}
              />
            </Field>
            <Field label="Fuero" htmlFor="forum" error={errors.forum}>
              <Input id="forum" name="forum" list="forum-suggestions" defaultValue={matter?.forum ?? ""} aria-invalid={invalid("forum")} />
              <datalist id="forum-suggestions">
                {forumSuggestions.map((forum) => (
                  <option key={forum} value={forum} />
                ))}
              </datalist>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Juzgado / organismo" htmlFor="court" error={errors.court}>
              <Input id="court" name="court" defaultValue={matter?.court ?? ""} placeholder="Ej.: Juzgado Civil N.º 3" aria-invalid={invalid("court")} />
            </Field>
            <Field label="Secretaría" htmlFor="secretariat" error={errors.secretariat}>
              <Input id="secretariat" name="secretariat" defaultValue={matter?.secretariat ?? ""} placeholder="Ej.: Sec. N.º 5" aria-invalid={invalid("secretariat")} />
            </Field>
            <Field label="Jurisdicción" htmlFor="jurisdiction" error={errors.jurisdiction} required>
              <Input id="jurisdiction" name="jurisdiction" defaultValue={matter?.jurisdiction ?? "Jujuy"} aria-invalid={invalid("jurisdiction")} />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Contraparte" htmlFor="counterpart" error={errors.counterpart}>
            <Input id="counterpart" name="counterpart" defaultValue={matter?.counterpart ?? ""} aria-invalid={invalid("counterpart")} />
          </Field>
          <Field label="Abogado/a de la contraparte" htmlFor="counterpart_lawyer" error={errors.counterpart_lawyer}>
            <Input
              id="counterpart_lawyer"
              name="counterpart_lawyer"
              defaultValue={matter?.counterpart_lawyer ?? ""}
              aria-invalid={invalid("counterpart_lawyer")}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Fecha de inicio" htmlFor="opened_on" error={errors.opened_on} required>
            <Input id="opened_on" name="opened_on" type="date" defaultValue={matter?.opened_on ?? today} />
          </Field>
          <Field label="Fecha de cierre" htmlFor="closed_on" error={errors.closed_on}>
            <Input
              id="closed_on"
              name="closed_on"
              type="date"
              defaultValue={matter?.closed_on ?? ""}
              aria-invalid={invalid("closed_on")}
            />
          </Field>
        </div>

        <Field label="Descripción / estrategia" htmlFor="description" error={errors.description}>
          <Textarea id="description" name="description" rows={5} defaultValue={matter?.description ?? ""} />
        </Field>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-canvas p-4">
          <input
            type="checkbox"
            name="is_sensitive"
            defaultChecked={matter?.is_sensitive ?? false}
            className="mt-0.5 size-5 shrink-0 accent-gold-600"
          />
          <span className="text-sm text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <ShieldAlert className="size-4 text-accent-ink" aria-hidden="true" />
              Expediente sensible
            </span>
            No se puede compartir con colaboradores. Recomendado para violencia de género o información de
            salud. Al marcarlo se revocan los accesos compartidos.
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-ink/8 pt-5 sm:flex-row sm:justify-end">
          <Link href={cancelHref} className={buttonClasses("ghost", "md")}>
            Cancelar
          </Link>
          <SubmitButton>
            <Save aria-hidden="true" />
            Guardar expediente
          </SubmitButton>
        </div>
      </Card>
    </form>
  );
}
