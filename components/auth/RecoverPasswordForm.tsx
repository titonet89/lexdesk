"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function RecoverPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/acceso/nueva-clave`,
    });
    setPending(false);
    if (resetError?.status === 429) {
      setError("Ya enviamos un enlace hace poco. Esperá un minuto antes de pedir otro.");
      return;
    }
    // Siempre el mismo mensaje: no revela si el email está registrado.
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Si el email corresponde a un usuario del panel, en unos minutos vas a recibir el enlace. Revisá también
        la carpeta de spam.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      <FormMessage message={error} />
      <Field label="Email" htmlFor="recover-email">
        <Input id="recover-email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
        {pending ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
