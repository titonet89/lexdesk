"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, LoaderCircle, X } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { isPasswordValid, passwordRules } from "@/lib/auth/password-policy";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface NewPasswordFormProps {
  /** Destino al terminar. Por defecto, el panel (que pedirá activar 2FA si falta). */
  redirectTo?: string;
}

export function NewPasswordForm({ redirectTo = "/panel" }: NewPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPasswordValid(password)) {
      setError("La contraseña no cumple los requisitos.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(
        updateError.code === "same_password"
          ? "La contraseña nueva tiene que ser distinta de la anterior."
          : updateError.code === "weak_password"
            ? "Esa contraseña es demasiado débil o aparece en filtraciones conocidas. Elegí otra."
            : updateError.code === "insufficient_aal"
              ? "Por seguridad, confirmá con el código de tu app antes de cambiar la contraseña."
              : updateError.code === "reauthentication_needed"
                ? "Por seguridad, cerrá sesión y volvé a ingresar antes de cambiar la contraseña."
                : "No se pudo actualizar la contraseña. Intentá de nuevo.",
      );
      return;
    }
    setSuccess("Contraseña actualizada.");
    setPassword("");
    setConfirmation("");
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4" data-testid="new-password-form">
      <FormMessage message={error} />
      <FormMessage message={success} tone="success" />
      <Field label="Contraseña nueva" htmlFor="new-password">
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Requisitos de la contraseña">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.id} className={cn("flex items-center gap-1.5", met ? "text-success-ink" : "text-ink-muted/70")}>
              {met ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
              {rule.label}
              <span className="sr-only">{met ? "(cumplido)" : "(pendiente)"}</span>
            </li>
          );
        })}
      </ul>
      <Field label="Repetir contraseña" htmlFor="confirm-password">
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          required
        />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
