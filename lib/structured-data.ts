import type { LegalService, WithContext } from "schema-dts";
import { primaryOffice, siteConfig } from "@/lib/site-config";

/** JSON-LD `LegalService`: solo incluye los campos confirmados en `siteConfig`. */
export function getLegalServiceJsonLd(): WithContext<LegalService> {
  const { lawyer, reviews, openingHoursSpecification, offices, instagram } = siteConfig;

  const jsonLd: WithContext<LegalService> = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${siteConfig.url}/#legalservice`,
    name: lawyer.name,
    description: `${lawyer.title} en ${offices.map((office) => office.name).join(" y ")}, Jujuy. Atención en ${siteConfig.practiceAreas
      .map((area) => area.title)
      .join(", ")}.`,
    url: siteConfig.url,
    telephone: `+${siteConfig.whatsappNumber}`,
    image: `${siteConfig.url}/opengraph-image`,
    areaServed: offices.map((office) => ({ "@type": "City" as const, name: office.locality })),
    address: {
      "@type": "PostalAddress",
      ...(primaryOffice.street ? { streetAddress: primaryOffice.street } : {}),
      addressLocality: primaryOffice.locality,
      addressRegion: primaryOffice.region,
      postalCode: primaryOffice.postalCode,
      addressCountry: primaryOffice.country,
    },
    founder: {
      "@type": "Person",
      name: lawyer.name,
      jobTitle: lawyer.title,
      ...(lawyer.university ? { alumniOf: lawyer.university } : {}),
    },
    knowsAbout: siteConfig.practiceAreas.map((area) => area.title),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Áreas de práctica",
      itemListElement: siteConfig.practiceAreas.map((area) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: area.title,
          description: area.summary,
        },
      })),
    },
  };

  if (siteConfig.email) {
    jsonLd.email = siteConfig.email;
  }

  if (instagram) {
    jsonLd.sameAs = [instagram.url];
  }

  if (openingHoursSpecification) {
    jsonLd.openingHoursSpecification = {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...openingHoursSpecification.dayOfWeek],
      opens: openingHoursSpecification.opens,
      closes: openingHoursSpecification.closes,
    };
  }

  if (reviews) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviews.rating,
      reviewCount: reviews.count,
      bestRating: 5,
    };
  }

  return jsonLd;
}

/** Serializa JSON-LD escapando `<` para evitar inyección de HTML. */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
