"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { promptInstall, useCanInstall } from "@/lib/pwa";

const DISMISSED_KEY = "lexdesk:install-dismissed";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

function readDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Boolean(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

const noSubscription = () => () => {};

/** Invita a instalar LexDesk como app cuando el navegador lo permite (Android, Windows, Mac). */
export function InstallAppBanner() {
  const canInstall = useCanInstall();
  const storedDismissal = useSyncExternalStore(noSubscription, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || storedDismissal || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Sin almacenamiento: se vuelve a mostrar en la próxima visita.
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Instalar la app"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-gold-600/30 bg-accent-soft p-3 pl-4 text-sm text-ink-soft"
    >
      <Download className="size-5 shrink-0 text-accent-ink" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold text-ink">Instalá LexDesk</span>
        <span className="hidden sm:inline"> para abrirlo como una app, con su ícono y a pantalla completa.</span>
      </p>
      <button type="button" onClick={() => void promptInstall()} className={buttonClasses("primary", "sm")}>
        Instalar
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-ink/5"
        aria-label="Ahora no"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
