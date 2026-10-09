"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, LoaderCircle, ShieldCheck } from "lucide-react";
import { TotpCodeInput } from "@/components/auth/TotpCodeInput";
import { Field, FormMessage } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export function EnrollTotpForm() {
  const router = useRouter();
  const startedRef = useRef(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Evita una doble inscripción en el doble montaje de desarrollo.
    if (startedRef.current) return;
    startedRef.current = true;

    async function enroll() {
      const supabase = createClient();
      // Limpia inscripciones previas que quedaron sin verificar.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? []) {
        if (factor.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Autenticador ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrollError || !data) {
        setError("No pudimos iniciar la activación. Recargá la página.");
        return;
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    }

    void enroll();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    if (code.length !== 6) {
      setError("Ingresá los 6 dígitos que muestra la app.");
      return;
    }
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    if (verifyError) {
      setPending(false);
      setCode("");
      setError("El código no coincide. Verificá que la hora del celular esté en automático y probá de nuevo.");
      return;
    }
    router.replace("/panel");
    router.refresh();
  }

  async function copySecret() {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-6 space-y-5" data-testid="enroll-form">
      <ol className="space-y-1.5 text-sm text-navy-800">
        <li>
          <strong>1.</strong> Instalá Google Authenticator o Microsoft Authenticator en tu celular.
        </li>
        <li>
          <strong>2.</strong> Escaneá este código QR desde la app.
        </li>
        <li>
          <strong>3.</strong> Ingresá el código de 6 dígitos que aparece.
        </li>
      </ol>

      <div className="grid place-items-center rounded-2xl border border-navy-900/10 bg-white p-4">
        {enrollment ? (
          // eslint-disable-next-line @next/next/no-img-element -- QR en data URI generado por el servidor de auth
          <img src={enrollment.qrCode} alt="Código QR para la app de autenticación" className="size-48" />
        ) : (
          <div className="grid size-48 place-items-center text-navy-700">
            <LoaderCircle className="size-6 animate-spin" aria-label="Generando código QR" />
          </div>
        )}
      </div>

      {enrollment ? (
        <details className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-navy-800">
          <summary className="cursor-pointer font-medium">¿No podés escanear? Ingresá la clave manualmente</summary>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all font-mono text-xs" data-testid="totp-secret">
              {enrollment.secret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gold-700 hover:bg-gold-50"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copiada" : "Copiar"}
            </button>
          </div>
        </details>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormMessage message={error} />
        <Field label="Código de la app" htmlFor="enroll-code">
          <TotpCodeInput id="enroll-code" value={code} onChange={setCode} invalid={Boolean(error)} />
        </Field>
        <button
          type="submit"
          disabled={pending || !enrollment}
          className={buttonClasses("primary", "lg", "w-full")}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          {pending ? "Activando…" : "Activar y continuar"}
        </button>
      </form>
    </div>
  );
}
