import { z } from "zod";

/**
 * Perfil público del estudio (datos que se muestran en el sitio).
 *
 * El repositorio solo contiene un perfil de DEMOSTRACIÓN. El perfil real se
 * inyecta por la variable de entorno NEXT_PUBLIC_SITE_PROFILE (JSON) en el
 * entorno de despliegue, de modo que los datos personales nunca quedan en git.
 * Ver `site-profile.example.json`.
 */

const officeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  street: z.string().nullable(),
  locality: z.string().min(1),
  region: z.string().min(1),
  postalCode: z.string(),
  country: z.string().length(2),
  mapQuery: z.string().nullable(),
  isPrimary: z.boolean(),
});

export const siteProfileSchema = z.object({
  lawyer: z.object({
    name: z.string().min(2),
    shortName: z.string().min(2),
    monogram: z.string().min(1).max(4),
    title: z.string().min(2),
    registration: z.string().min(1),
    university: z.string().nullable(),
    bio: z.array(z.string()).min(1),
  }),
  whatsappNumber: z.string().regex(/^\d{8,15}$/),
  phoneDisplay: z.string().min(6),
  email: z.email().nullable(),
  instagram: z.object({ handle: z.string(), url: z.url() }).nullable(),
  offices: z.array(officeSchema).min(1),
  offersOnlineConsultations: z.boolean(),
  officeHours: z.array(z.object({ days: z.string(), hours: z.string() })),
  openingHoursSpecification: z
    .object({
      dayOfWeek: z.array(z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])),
      opens: z.string(),
      closes: z.string(),
    })
    .nullable(),
  reviews: z.object({ rating: z.number().min(0).max(5), count: z.number().int(), googleProfileUrl: z.url() }).nullable(),
  achievements: z.array(z.object({ value: z.string(), label: z.string() })),
  credentials: z.array(z.string()),
  testimonials: z.array(z.object({ quote: z.string(), author: z.string(), context: z.string() })),
});

export type SiteProfile = z.infer<typeof siteProfileSchema>;

/** Perfil ficticio para el repositorio público y los entornos de desarrollo. */
export const demoProfile: SiteProfile = {
  lawyer: {
    name: "Dra. Lucía Herrera",
    shortName: "Dra. Lucía Herrera",
    monogram: "LH",
    title: "Abogada",
    registration: "M.P. 0000",
    university: null,
    bio: [
      "Acompaño a personas y familias en los momentos en que una decisión legal define su futuro. Mi enfoque es claro: escuchar, explicar sin tecnicismos y actuar con compromiso.",
      "Cada consulta recibe una estrategia personalizada, honorarios claros desde el primer contacto y seguimiento directo conmigo, sin intermediarios. También atiendo consultas en línea, estés donde estés.",
    ],
  },
  whatsappNumber: "5493880000000",
  phoneDisplay: "+54 9 388 000-0000",
  email: "contacto@lexdesk.demo",
  instagram: null,
  offices: [
    {
      id: "san-salvador",
      name: "San Salvador de Jujuy",
      street: "Av. Ejemplo 123",
      locality: "San Salvador de Jujuy",
      region: "Jujuy",
      postalCode: "Y4600",
      country: "AR",
      mapQuery: "Plaza Belgrano, San Salvador de Jujuy, Argentina",
      isPrimary: true,
    },
  ],
  offersOnlineConsultations: true,
  officeHours: [{ days: "Lunes a viernes", hours: "9:00 a 13:00 y 16:00 a 19:00" }],
  openingHoursSpecification: null,
  reviews: null,
  achievements: [],
  credentials: [],
  testimonials: [],
};

/** Carga el perfil desde NEXT_PUBLIC_SITE_PROFILE; si falta o es inválido, usa el de demostración. */
export function loadSiteProfile(): SiteProfile {
  const raw = process.env.NEXT_PUBLIC_SITE_PROFILE;
  if (!raw) return demoProfile;
  try {
    const parsed = siteProfileSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    console.error("NEXT_PUBLIC_SITE_PROFILE inválido; se usa el perfil de demostración.", parsed.error.issues);
  } catch {
    console.error("NEXT_PUBLIC_SITE_PROFILE no es JSON válido; se usa el perfil de demostración.");
  }
  return demoProfile;
}
