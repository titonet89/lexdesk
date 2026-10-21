"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { FormMessage } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { dismissPasskeyOffer, registerPasskey, rememberPasskeyDevice } from "@/lib/auth/passkey-client";
import { createClient } from "@/lib/supabase/client";

export function EnrollPasskeyOffer({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goOn() {
    router.replace(nextPath);
    router.refresh();
  }

  async function handleEnable() {
    setPending(true);
    setError(null);
    const result = await registerPasskey(createClient());
    if (result.ok) {
      rememberPasskeyDevice(true);
      goOn();
      return;
    }
    setPending(false);
    if (result.reason === "cancelled") return;
    setError(result.message ?? "No pudimos activar el ingreso rápido en este dispositivo. Podés intentarlo más tarde desde Seguridad.");
  }

  function handleSkip() {
    dismissPasskeyOffer();
    goOn();
  }

  return (
    <div className="mt-6 space-y-4">
      <FormMessage message={error} />
      <ul className="space-y-2.5 rounded-2xl bg-canvas p-4 text-sm text-ink-soft">
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-success-ink" aria-hidden="true" />
          Es tan seguro como la contraseña más el código: hace falta este dispositivo y su desbloqueo.
        </li>
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-success-ink" aria-hidden="true" />
          Tu rostro o tu huella no salen del dispositivo: LexDesk nunca los recibe.
        </li>
      </ul>
      <button type="button" onClick={handleEnable} disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
        {pending ? "Esperando al dispositivo…" : "Activar ingreso rápido"}
      </button>
      <button type="button" onClick={handleSkip} disabled={pending} className={buttonClasses("ghost", "md", "w-full")}>
        Ahora no
      </button>
    </div>
  );
}
