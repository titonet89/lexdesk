"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";

const IDLE_LIMIT_MS = 30 * 60 * 1000;
const WARNING_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Cierra la sesión tras 30 minutos sin actividad, con un aviso 2 minutos antes.
 * Complementa el límite de inactividad del servidor de autenticación.
 */
export function IdleLogout() {
  const lastActivity = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const markActive = useCallback(() => {
    lastActivity.current = Date.now();
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    lastActivity.current = Date.now();
    const onActivity = () => {
      // Mientras se muestra el aviso, solo el botón "Seguir conectada" lo cierra.
      if (Date.now() - lastActivity.current < IDLE_LIMIT_MS - WARNING_MS) lastActivity.current = Date.now();
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });

    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) {
        window.clearInterval(interval);
        void signOutAction("inactividad");
      } else if (idle >= IDLE_LIMIT_MS - WARNING_MS) {
        setSecondsLeft(Math.ceil((IDLE_LIMIT_MS - idle) / 1000));
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
    };
  }, []);

  return (
    <Dialog.Root open={secondsLeft !== null} onOpenChange={(open) => (!open ? markActive() : undefined)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-2xl">
          <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-ink">
            <Clock className="size-5" aria-hidden="true" />
          </span>
          <Dialog.Title className="mt-4 font-serif text-xl text-ink">¿Seguís ahí?</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-ink-muted">
            Por seguridad, vamos a cerrar tu sesión en{" "}
            <strong className="tabular-nums">
              {secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : ""}
            </strong>
            .
          </Dialog.Description>
          <button type="button" onClick={markActive} className={buttonClasses("primary", "md", "mt-5 w-full")}>
            Seguir conectada
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
