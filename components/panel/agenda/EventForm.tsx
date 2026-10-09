"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator, Info, Save } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Card, Field, FormMessage, Input, Select, Textarea } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/actions";
import { addBusinessDaysFrom, formatDateOnly } from "@/lib/panel/dates";
import { eventKindLabels, eventPriorityLabels, toOptions } from "@/lib/panel/labels";
import type { Database } from "@/lib/supabase/database.types";

type EventKind = Database["public"]["Enums"]["event_kind"];

export interface EventFormDefaults {
  matter_id: string;
  title: string;
  kind: EventKind;
  priority: Database["public"]["Enums"]["event_priority"];
  date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  deadline_from: string;
  deadline_business_days: string;
}

interface EventFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  defaults: EventFormDefaults;
  matters: { id: string; title: string }[];
  nonWorkingDays: { day: string; description: string }[];
  cancelHref: string;
  submitLabel: string;
}

export function EventForm({ action, defaults, matters, nonWorkingDays, cancelHref, submitLabel }: EventFormProps) {
  const [state, formAction] = useActionState(action, initialActionState);
  const errors = state.fieldErrors;

  const [kind, setKind] = useState<EventKind>(defaults.kind);
  const [allDay, setAllDay] = useState(defaults.all_day);
  const [date, setDate] = useState(defaults.date);
  const [deadlineFrom, setDeadlineFrom] = useState(defaults.deadline_from);
  const [businessDays, setBusinessDays] = useState(defaults.deadline_business_days);

  const nonWorkingSet = useMemo(() => new Set(nonWorkingDays.map((item) => item.day)), [nonWorkingDays]);
  const descriptions = useMemo(() => new Map(nonWorkingDays.map((item) => [item.day, item.description])), [nonWorkingDays]);

  const calculation = useMemo(() => {
    const days = Number(businessDays);
    if (!deadlineFrom || !Number.isInteger(days) || days < 1 || days > 365) return null;
    return addBusinessDaysFrom(deadlineFrom, days, nonWorkingSet);
  }, [deadlineFrom, businessDays, nonWorkingSet]);

  const showCalculator = kind === "vencimiento";

  return (
    <form action={formAction} noValidate>
      <Card className="space-y-5 p-5 sm:p-6">
        <FormMessage message={state.ok ? null : state.message} />

        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Título" htmlFor="title" error={errors.title} required>
            <Input
              id="title"
              name="title"
              defaultValue={defaults.title}
              placeholder="Ej.: Contestar traslado de demanda"
              aria-invalid={errors.title ? true : undefined}
            />
          </Field>
          <Field label="Tipo" htmlFor="kind" error={errors.kind}>
            <Select id="kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as EventKind)}>
              {toOptions(eventKindLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="priority" error={errors.priority}>
            <Select id="priority" name="priority" defaultValue={defaults.priority}>
              {toOptions(eventPriorityLabels).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Expediente" htmlFor="matter_id" error={errors.matter_id}>
          <Select id="matter_id" name="matter_id" defaultValue={defaults.matter_id}>
            <option value="">Sin expediente</option>
            {matters.map((matter) => (
              <option key={matter.id} value={matter.id}>
                {matter.title}
              </option>
            ))}
          </Select>
        </Field>

        {showCalculator ? (
          <div className="rounded-2xl border border-gold-600/25 bg-accent-soft/60 p-4 sm:p-5" data-testid="deadline-calculator">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <Calculator className="size-4.5 text-accent-ink" aria-hidden="true" />
              Calcular plazo en días hábiles
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <Field label="Notificado el" htmlFor="deadline_from" error={errors.deadline_from}>
                <Input
                  id="deadline_from"
                  name="deadline_from"
                  type="date"
                  value={deadlineFrom}
                  onChange={(event) => setDeadlineFrom(event.target.value)}
                />
              </Field>
              <Field label="Días hábiles" htmlFor="deadline_business_days" error={errors.deadline_business_days}>
                <Input
                  id="deadline_business_days"
                  name="deadline_business_days"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={businessDays}
                  onChange={(event) => setBusinessDays(event.target.value)}
                />
              </Field>
              <button
                type="button"
                disabled={!calculation}
                onClick={() => calculation && setDate(calculation.dueDate)}
                className={buttonClasses("secondary", "md")}
              >
                Usar fecha
              </button>
            </div>
            {calculation ? (
              <div className="mt-3 space-y-1 text-sm text-ink-soft" aria-live="polite">
                <p>
                  Vence el <strong data-testid="deadline-result">{formatDateOnly(calculation.dueDate, "EEEE d 'de' MMMM 'de' yyyy")}</strong>.
                </p>
                {calculation.skipped.length > 0 ? (
                  <p className="text-ink-muted">
                    Se saltearon:{" "}
                    {calculation.skipped
                      .map((day) => `${formatDateOnly(day, "d/M")} (${descriptions.get(day) ?? "inhábil"})`)
                      .join(", ")}
                    .
                  </p>
                ) : null}
                <p className="flex items-start gap-1.5 text-xs text-ink-muted/80">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Cuenta desde el día hábil siguiente a la notificación. Verificá el plazo de gracia y los días
                  inhábiles cargados en Ajustes → Feriados.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <Field label="Fecha" htmlFor="date" error={errors.date} required>
            <Input id="date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <label className="flex h-11 cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="all_day"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="size-5 accent-gold-600"
            />
            Todo el día
          </label>
          <Field label="Desde" htmlFor="start_time" error={errors.start_time}>
            <Input id="start_time" name="start_time" type="time" defaultValue={defaults.start_time} disabled={allDay} />
          </Field>
          <Field label="Hasta" htmlFor="end_time" error={errors.end_time}>
            <Input id="end_time" name="end_time" type="time" defaultValue={defaults.end_time} disabled={allDay} />
          </Field>
        </div>

        <Field label="Lugar" htmlFor="location" error={errors.location}>
          <Input id="location" name="location" defaultValue={defaults.location} placeholder="Ej.: Juzgado de Familia N.º 2, San Salvador de Jujuy" />
        </Field>

        <Field label="Notas" htmlFor="notes" error={errors.notes}>
          <Textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes} />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-ink/8 pt-5 sm:flex-row sm:justify-end">
          <Link href={cancelHref} className={buttonClasses("ghost", "md")}>
            Cancelar
          </Link>
          <SubmitButton>
            <Save aria-hidden="true" />
            {submitLabel}
          </SubmitButton>
        </div>
      </Card>
    </form>
  );
}
