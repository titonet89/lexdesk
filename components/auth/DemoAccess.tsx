"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle, LogIn, TriangleAlert } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { enterDemoAction } from "@/lib/auth/demo-actions";

function EnterButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
      {pending ? "Preparando la demo…" : "Entrar a la demo"}
    </button>
  );
}

/** Ingreso de la demo: un botón, sin contraseña ni código. */
export function DemoAccess() {
  return (
    <form action={enterDemoAction} className="mt-6 space-y-4" data-testid="demo-access">
      <EnterButton />
      <p className="flex gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink-soft">
        <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-accent-ink" aria-hidden="true" />
        Es una demostración compartida con datos ficticios. No cargues información real de clientes.
      </p>
    </form>
  );
}
