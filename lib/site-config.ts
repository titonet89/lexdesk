/**
 * Configuración central del sitio público.
 *
 * Todos los datos de la profesional viven acá: cambiar un valor en este archivo
 * actualiza la página, los mensajes de WhatsApp, la metadata y el JSON-LD.
 *
 * Los datos personales NO están en este archivo: llegan del perfil cargado
 * por entorno (ver lib/site-profile.ts). Acá quedan las áreas de práctica.
 *
 * Regla: lo que no esté confirmado se deja vacío (`null` o `[]`) y la sección
 * correspondiente se oculta sola. Nunca cargar datos inventados.
 */

import type { DayOfWeek } from "schema-dts";
import { loadSiteProfile } from "@/lib/site-profile";

export type PracticeAreaId = "familia" | "sucesiones" | "civil" | "laboral" | "violencia-genero";

export interface PracticeArea {
  id: PracticeAreaId;
  title: string;
  summary: string;
  highlights: readonly string[];
  /** Aviso destacado que se muestra dentro de la tarjeta (ej.: líneas de emergencia). */
  notice?: string;
}

export interface Achievement {
  value: string;
  label: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  context: string;
}

export interface OfficeHours {
  days: string;
  hours: string;
}

export interface Office {
  id: string;
  name: string;
  /** Dirección postal. `null` si todavía no está confirmada. */
  street: string | null;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  /** Consulta para el mapa embebido. `null` oculta el mapa de esta sede. */
  mapQuery: string | null;
  isPrimary: boolean;
}

export interface SiteConfig {
  url: string;
  locale: string;
  lawyer: {
    name: string;
    shortName: string;
    monogram: string;
    title: string;
    registration: string;
    /** `null` hasta confirmar. */
    university: string | null;
    bio: readonly string[];
  };
  whatsappNumber: string;
  phoneDisplay: string;
  email: string | null;
  instagram: { handle: string; url: string } | null;
  offices: readonly Office[];
  /** Ofrece consultas a distancia (videollamada / WhatsApp). */
  offersOnlineConsultations: boolean;
  officeHours: readonly OfficeHours[];
  openingHoursSpecification: {
    dayOfWeek: readonly DayOfWeek[];
    opens: string;
    closes: string;
  } | null;
  /** `null` si no hay perfil de Google Business: se ocultan las insignias de reseñas. */
  reviews: {
    rating: number;
    count: number;
    googleProfileUrl: string;
  } | null;
  achievements: readonly Achievement[];
  credentials: readonly string[];
  testimonials: readonly Testimonial[];
  practiceAreas: readonly PracticeArea[];
}

function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Solo se permite indexar en buscadores cuando hay un dominio definitivo
 * configurado (variable NEXT_PUBLIC_SITE_URL en Vercel, entorno Production).
 * Mientras tanto, cualquier URL *.vercel.app queda como staging (noindex).
 */
export const isProductionDeployment =
  process.env.VERCEL_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SITE_URL);

const profile = loadSiteProfile();

export const siteConfig: SiteConfig = {
  url: resolveSiteUrl(),
  locale: "es_AR",
  ...profile,

  practiceAreas: [
    {
      id: "familia",
      title: "Derecho de Familia",
      summary:
        "Divorcios, cuota alimentaria, cuidado personal de hijos y régimen de comunicación.",
      highlights: ["Divorcios", "Alimentos", "Cuidado personal y régimen de comunicación"],
    },
    {
      id: "sucesiones",
      title: "Sucesiones",
      summary:
        "Trámites sucesorios completos, declaratoria de herederos y partición de bienes.",
      highlights: ["Declaratoria de herederos", "Testamentos", "Partición de bienes"],
    },
    {
      id: "civil",
      title: "Derecho Civil",
      summary:
        "Contratos, reclamos por daños y perjuicios, cobros y conflictos entre particulares.",
      highlights: ["Contratos y alquileres", "Daños y perjuicios", "Cobro de deudas"],
    },
    {
      id: "laboral",
      title: "Derecho Laboral",
      summary:
        "Despidos, trabajo no registrado, accidentes de trabajo y reclamos indemnizatorios.",
      highlights: ["Despidos", "Trabajo no registrado", "Accidentes y reclamos a la ART"],
    },
    {
      id: "violencia-genero",
      title: "Violencia de Género",
      summary:
        "Acompañamiento legal, denuncias y medidas de protección con confidencialidad absoluta.",
      highlights: ["Medidas de protección", "Exclusión del hogar", "Acompañamiento en denuncias"],
      notice: "Si estás en peligro, llamá al 911. Línea 144: gratuita, confidencial y las 24 h.",
    },
  ],
};

export const primaryOffice: Office =
  siteConfig.offices.find((office) => office.isPrimary) ?? siteConfig.offices[0];

/** Texto corto de las localidades donde atiende, ej.: "Sede A · Sede B · En línea". */
export const serviceAreasLabel = [
  ...siteConfig.offices.map((office) => office.name),
  ...(siteConfig.offersOnlineConsultations ? ["En línea"] : []),
].join(" · ");

/** Lista en lenguaje natural: ["A", "B", "C"] → "A, B y C". */
function joinSpanish(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** Localidades con oficina, ej.: "Sede A y Sede B". */
export const officesLabel = joinSpanish(siteConfig.offices.map((office) => office.name));

/** Áreas de práctica en minúscula, ej.: "familia, sucesiones y civil". */
export const practiceAreasLabel = joinSpanish(
  siteConfig.practiceAreas.map((area) => area.title.replace(/^Derecho (de )?/, "").toLowerCase()),
);
