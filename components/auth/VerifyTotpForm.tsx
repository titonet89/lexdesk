"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { TotpCodeInput } from "@/components/auth/TotpCodeInput";
import { Field, FormMessage } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function VerifyTotpForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) {
      setError("Ingresá los 6 dígitos del código.");
      return;
    }
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((item) => item.status === "verified");
    if (factorsError || !factor) {
      setPending(false);
      setError("No encontramos tu verificación en dos pasos. Volvé a iniciar sesión.");
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (verifyError) {
      setPending(false);
      setCode("");
      setError(
        verifyError.status === 429
          ? "Demasiados intentos. Esperá unos minutos."
          : "Código incorrecto o vencido. Probá con el código actual.",
      );
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4" data-testid="verify-form">
      <FormMessage message={error} />
      <Field label="Código de verificación" htmlFor="totp-code">
        <TotpCodeInput id="totp-code" value={code} onChange={setCode} invalid={Boolean(error)} autoFocus />
      </Field>
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
        {pending ? "Verificando…" : "Verificar"}
      </button>
    </form>
  );
}
