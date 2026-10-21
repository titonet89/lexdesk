"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

/** Activa la app instalable: registra el service worker y empieza a escuchar el aviso de instalación. */
export function PwaSetup() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
