"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint, LoaderCircle } from "lucide-react";
import { FormMessage } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { registerPasskey, rememberPasskeyDevice, usePasskeyAvailability } from "@/lib/auth/passkey-client";
import { createClient } from "@/lib/supabase/client";

/**
 * Agrega una passkey para este dispositivo. Supabase exige haber ingresado con
 * contraseña + código en esta sesión (`canRegister`); si se entró con huella,
 * se pide confirmar con el código primero.
 */
export function AddPasskeyButton({ canRegister }: { canRegister: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);

  const availability = usePasskeyAvailability();

  if (availability === "unknown") return null;
  if (availability === "hidden") {
    return <p className="text-ink-muted">Este navegador no permite ingresar con huella. Probá con Chrome, Edge o Safari actualizados.</p>;
  }
  if (!canRegister) {
    return (
      <Link
        href="/acceso/verificar?next=/panel/ajustes/seguridad"
        className={buttonClasses("secondary", "sm")}
      >
        <Fingerprint aria-hidden="true" />
        Confirmar con el código para agregar un dispositivo
      </Link>
    );
  }

  async function handleAdd() {
    setPending(true);
    setMessage(null);
    const result = await registerPasskey(createClient());
    setPending(false);
    if (result.ok) {
      rememberPasskeyDevice(true);
      setMessage({ text: "Listo: la próxima vez podés ingresar con tu huella en este dispositivo.", tone: "success" });
      router.refresh();
      return;
    }
    if (result.reason === "cancelled") return;
    setMessage({ text: result.message ?? "No pudimos activar la huella en este dispositivo.", tone: "error" });
  }

  return (
    <div className="space-y-3">
      <FormMessage message={message?.text} tone={message?.tone} />
      <button type="button" onClick={handleAdd} disabled={pending} className={buttonClasses("secondary", "sm")}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Fingerprint aria-hidden="true" />}
        {pending ? "Esperando al dispositivo…" : "Activar huella en este dispositivo"}
      </button>
    </div>
  );
}
