"use client";

import { useId, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Label from "@radix-ui/react-label";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, CircleCheck, Lock, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  consultationSchema,
  type ConsultationInput,
  type ConsultationValues,
} from "@/lib/consultation-schema";
import { siteConfig } from "@/lib/site-config";
import { buildLeadMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const ease = [0.23, 1, 0.32, 1] as const;

const fieldClasses =
  "w-full rounded-2xl border bg-white px-4 text-base text-navy-900 placeholder:text-navy-700/45 " +
  "transition-[border-color,box-shadow] duration-200 outline-none " +
  "focus:border-gold-600 focus:ring-4 focus:ring-gold-600/15";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div>
      <Label.Root htmlFor={id} className="mb-2 block text-sm font-semibold text-navy-900">
        {label}
      </Label.Root>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-sm text-red-700"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease }}
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p key="hint" id={`${id}-hint`} className="mt-1.5 text-sm text-navy-700/70">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ConsultationForm() {
  const baseId = useId();
  const ids = {
    name: `${baseId}-name`,
    phone: `${baseId}-phone`,
    specialty: `${baseId}-specialty`,
    message: `${baseId}-message`,
    consent: `${baseId}-consent`,
  };

  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationInput, unknown, ConsultationValues>({
    resolver: zodResolver(consultationSchema),
    mode: "onTouched",
    defaultValues: { name: "", phone: "", specialty: undefined, message: "", consent: false },
  });

  const messageLength = useWatch({ control, name: "message" })?.length ?? 0;

  const onSubmit = (values: ConsultationValues) => {
    const url = buildWhatsAppUrl(buildLeadMessage(values));
    setWhatsappUrl(url);
    const opened = window.open(url, "_blank");
    // Algunos navegadores móviles bloquean pop-ups tras una validación asíncrona:
    // el estado de éxito muestra igualmente el enlace para abrir WhatsApp.
    if (opened) opened.opener = null;
  };

  const handleReset = () => {
    reset();
    setWhatsappUrl(null);
  };

  const describedBy = (field: keyof typeof ids, hasHint = false) =>
    errors[field] ? `${ids[field]}-error` : hasHint ? `${ids[field]}-hint` : undefined;

  return (
    <section id="consulta" aria-labelledby="consultation-title" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:pt-6">
          <p className="text-sm font-semibold tracking-[0.18em] text-gold-700 uppercase">Consulta</p>
          <h2 id="consultation-title" className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Contame tu caso y te respondo a la brevedad
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-700">
            Completá el formulario y se abrirá WhatsApp con tu mensaje listo para enviar. Sin
            esperas, sin intermediarios.
          </p>
          <ul className="mt-8 space-y-4 text-navy-800">
            {[
              "Orientación inicial por WhatsApp",
              "Honorarios claros desde el inicio",
              "Atención directa con la abogada",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CircleCheck className="size-5 shrink-0 text-gold-700" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-[2rem] border border-navy-900/8 bg-white p-6 shadow-[0_30px_60px_-30px_rgb(15_23_42/0.25)] sm:p-10">
          <AnimatePresence mode="wait" initial={false}>
            {whatsappUrl ? (
              <motion.div
                key="success"
                role="status"
                data-testid="form-success"
                className="flex min-h-[28rem] flex-col items-center justify-center text-center"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3, ease }}
              >
                <span className="grid size-16 place-items-center rounded-full bg-gold-50 text-gold-700">
                  <CircleCheck className="size-8" aria-hidden="true" />
                </span>
                <h3 className="mt-6 font-serif text-3xl">¡Tu mensaje está listo!</h3>
                <p className="mt-3 max-w-sm leading-relaxed text-navy-700">
                  Si WhatsApp no se abrió automáticamente, tocá el botón para enviar tu consulta.
                </p>
                <ButtonLink
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  className="mt-8"
                  data-testid="form-whatsapp-link"
                >
                  <WhatsAppIcon />
                  Abrir WhatsApp
                </ButtonLink>
                <Button variant="ghost" size="sm" className="mt-3" onClick={handleReset}>
                  <RotateCcw aria-hidden="true" />
                  Enviar otra consulta
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
                data-testid="consultation-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={ids.name} label="Nombre y apellido" error={errors.name?.message}>
                    <input
                      id={ids.name}
                      type="text"
                      autoComplete="name"
                      placeholder="Ej.: María González"
                      aria-invalid={errors.name ? true : undefined}
                      aria-describedby={describedBy("name")}
                      className={cn(fieldClasses, "h-12", errors.name ? "border-red-600" : "border-navy-900/15")}
                      {...register("name")}
                    />
                  </Field>

                  <Field
                    id={ids.phone}
                    label="WhatsApp"
                    error={errors.phone?.message}
                    hint="Con característica, sin 0 ni 15."
                  >
                    <input
                      id={ids.phone}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Ej.: 388 412 3456"
                      aria-invalid={errors.phone ? true : undefined}
                      aria-describedby={describedBy("phone", true)}
                      className={cn(fieldClasses, "h-12", errors.phone ? "border-red-600" : "border-navy-900/15")}
                      {...register("phone")}
                    />
                  </Field>
                </div>

                <Field id={ids.specialty} label="Área de consulta" error={errors.specialty?.message}>
                  <div className="relative">
                    <select
                      id={ids.specialty}
                      defaultValue=""
                      aria-invalid={errors.specialty ? true : undefined}
                      aria-describedby={describedBy("specialty")}
                      className={cn(
                        fieldClasses,
                        "h-12 appearance-none pr-11",
                        errors.specialty ? "border-red-600" : "border-navy-900/15",
                      )}
                      {...register("specialty")}
                    >
                      <option value="" disabled>
                        Seleccioná una opción
                      </option>
                      {siteConfig.practiceAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-navy-700"
                      aria-hidden="true"
                    />
                  </div>
                </Field>

                <Field
                  id={ids.message}
                  label="Tu consulta"
                  error={errors.message?.message}
                  hint={`${messageLength}/1000 caracteres`}
                >
                  <textarea
                    id={ids.message}
                    rows={5}
                    placeholder="Contanos brevemente qué pasó y desde cuándo."
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={describedBy("message", true)}
                    className={cn(
                      fieldClasses,
                      "resize-none py-3 leading-relaxed",
                      errors.message ? "border-red-600" : "border-navy-900/15",
                    )}
                    {...register("message")}
                  />
                </Field>

                <div>
                  <div className="flex items-start gap-3">
                    <input
                      id={ids.consent}
                      type="checkbox"
                      aria-invalid={errors.consent ? true : undefined}
                      aria-describedby={errors.consent ? `${ids.consent}-error` : undefined}
                      className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-gold-600"
                      {...register("consent")}
                    />
                    <Label.Root htmlFor={ids.consent} className="cursor-pointer text-sm leading-relaxed text-navy-700">
                      Acepto que mis datos se utilicen únicamente para responder esta consulta, conforme a la
                      Ley 25.326 y la{" "}
                      <a
                        href="/privacidad"
                        target="_blank"
                        className="font-medium text-gold-700 underline underline-offset-2"
                      >
                        Política de Privacidad
                      </a>
                      .
                    </Label.Root>
                  </div>
                  {errors.consent ? (
                    <p id={`${ids.consent}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
                      {errors.consent.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting} data-testid="form-submit">
                  <WhatsAppIcon />
                  Enviar consulta por WhatsApp
                </Button>

                <p className="flex items-center justify-center gap-1.5 text-xs text-navy-700/70">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Tus datos son confidenciales y protegidos por el secreto profesional.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
