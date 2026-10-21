"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LoaderCircle, ShieldCheck } from "lucide-react";
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
    setError(result.message ?? "No pudimos activar la huella en este dispositivo. Podés intentarlo más tarde desde Seguridad.");
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
          Es tan seguro como la contraseña más el código: hace falta este dispositivo y tu huella o PIN.
        </li>
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-success-ink" aria-hidden="true" />
          Tu huella no sale del dispositivo: LexDesk nunca la recibe.
        </li>
      </ul>
      <button type="button" onClick={handleEnable} disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Fingerprint aria-hidden="true" />}
        {pending ? "Esperando al dispositivo…" : "Activar huella en este dispositivo"}
      </button>
      <button type="button" onClick={handleSkip} disabled={pending} className={buttonClasses("ghost", "md", "w-full")}>
        Ahora no
      </button>
    </div>
  );
}
