import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

/**
 * Manifiesto de la app instalable (PWA): con esto el panel se puede agregar a
 * la pantalla de inicio del celular o instalar en la computadora, y se abre a
 * pantalla completa, sin la barra del navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/panel",
    name: "LexDesk · Panel del estudio",
    short_name: "LexDesk",
    description: `${brand.tagline}: expedientes, agenda de plazos, clientes y honorarios del estudio.`,
    lang: "es-AR",
    dir: "ltr",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Agenda", url: "/panel/agenda", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Expedientes", url: "/panel/expedientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Nuevo cliente", url: "/panel/clientes/nuevo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
