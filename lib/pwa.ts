"use client";

import { useSyncExternalStore } from "react";

/**
 * App instalable (PWA): el aviso de instalación del navegador y el registro
 * del service worker.
 *
 * Chrome y Edge (Android, Windows, Mac) emiten `beforeinstallprompt` cuando el
 * sitio se puede instalar. Se guarda el evento para mostrar un botón propio
 * ("Instalar app") en lugar del aviso genérico del navegador.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** ¿El navegador ofrece instalar la app ahora? */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );
}

/** Abre el diálogo de instalación del navegador. Devuelve true si se instaló. */
export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  // El evento solo se puede usar una vez.
  deferredPrompt = null;
  notify();
  return outcome === "accepted";
}

/** Registra el service worker (solo en producción: en desarrollo interfiere con la recarga en caliente). */
export function registerServiceWorker(): void {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
    // Sin service worker la app funciona igual: solo no muestra la pantalla "Sin conexión".
  });
}
