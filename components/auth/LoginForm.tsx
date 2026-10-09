"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * El login se hace desde el navegador a propósito: así el límite de intentos
 * del servicio de autenticación se aplica por la IP real de cada persona.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Completá tu email y contraseña.");
      return;
    }

    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setPending(false);
      // Mensaje genérico: no revela si el email existe.
      setError(
        signInError.status === 429
          ? "Demasiados intentos. Esperá unos minutos antes de volver a probar."
          : "Email o contraseña incorrectos.",
      );
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const destination =
      aal?.nextLevel === "aal1" ? "/acceso/activar-2fa" : aal?.currentLevel === "aal2" ? "/panel" : "/acceso/verificar";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4" data-testid="login-form">
      <FormMessage message={error} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" inputMode="email" required autoFocus />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-ink/5"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
          </button>
        </div>
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-center text-sm">
        <Link href="/acceso/recuperar" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
