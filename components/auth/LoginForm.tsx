"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, LoaderCircle, LogIn } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { isStrongSession } from "@/lib/auth/assurance";
import { rememberPasskeyDevice, signInWithPasskey, usePasskeyAvailability } from "@/lib/auth/passkey-client";
import { createClient } from "@/lib/supabase/client";

/**
 * El login se hace desde el navegador a propósito: así el límite de intentos
 * del servicio de autenticación se aplica por la IP real de cada persona.
 *
 * Si el navegador admite passkeys se ofrece "Ingresar sin contraseña". En
 * los dispositivos donde ya se usó, es la única opción visible y el formulario
 * de contraseña queda detrás de un enlace.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "passkey" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passkeyMode = usePasskeyAvailability();
  const [passwordRequested, setPasswordOpen] = useState(false);
  const passwordOpen = passwordRequested || passkeyMode !== "preferred";

  async function handlePasskey() {
    setPending("passkey");
    setError(null);
    const result = await signInWithPasskey(createClient());
    if (result.ok) {
      rememberPasskeyDevice(true);
      router.replace("/panel");
      router.refresh();
      return;
    }
    setPending(null);
    if (result.reason === "cancelled") return;
    setError(
      "No pudimos ingresar sin contraseña. Si todavía no activaste el ingreso rápido en este dispositivo, ingresá con tu email y contraseña.",
    );
    setPasswordOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Completá tu email y contraseña.");
      return;
    }

    setPending("password");
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setPending(null);
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
      aal?.nextLevel === "aal1" ? "/acceso/activar-2fa" : isStrongSession(aal) ? "/panel" : "/acceso/verificar";
    router.replace(destination);
    router.refresh();
  }

  return (
    <div className="mt-6 space-y-5" data-testid="login-form">
      <FormMessage message={error} />

      {passkeyMode === "available" || passkeyMode === "preferred" ? (
        <>
          <button
            type="button"
            onClick={handlePasskey}
            disabled={pending !== null}
            className={buttonClasses("primary", "lg", "w-full")}
          >
            {pending === "passkey" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound aria-hidden="true" />
            )}
            {pending === "passkey" ? "Esperando al dispositivo…" : "Ingresar sin contraseña"}
          </button>
          <p className="-mt-2 text-center text-xs text-balance text-ink-muted">Con el rostro, la huella o el PIN de tu dispositivo.</p>
          {passwordOpen ? (
            <p className="flex items-center gap-3 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />o con tu email
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
            </p>
          ) : (
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="font-medium text-accent-ink underline-offset-4 hover:underline"
              >
                Ingresar con email y contraseña
              </button>
            </p>
          )}
        </>
      ) : null}

      {passwordOpen ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              autoFocus={passkeyMode === "hidden"}
            />
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
          <button
            type="submit"
            disabled={pending !== null}
            className={buttonClasses(passkeyMode === "available" ? "secondary" : "primary", "lg", "w-full")}
          >
            {pending === "password" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
            {pending === "password" ? "Ingresando…" : "Ingresar"}
          </button>
          <p className="text-center text-sm">
            <Link href="/acceso/recuperar" className="font-medium text-accent-ink underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </p>
        </form>
      ) : null}
    </div>
  );
}
