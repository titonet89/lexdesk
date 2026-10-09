import Link from "next/link";
import { Clock, Laptop, LockKeyhole, Mail, MapPin, Phone } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { BrandMark } from "@/components/BrandMark";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { primaryOffice, siteConfig } from "@/lib/site-config";
import { getLegalServiceJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp";

export function FooterSection() {
  const { offices, officeHours, lawyer, instagram } = siteConfig;
  const year = new Date().getFullYear();
  const mapSrc = primaryOffice.mapQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(primaryOffice.mapQuery)}&z=15&output=embed`
    : null;

  return (
    <footer id="contacto" aria-labelledby="footer-title" className="bg-navy-950 text-slate-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(getLegalServiceJsonLd()) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-3 text-white">
              <BrandMark className="size-12 text-base" />
              <div>
                <h2 id="footer-title" className="font-serif text-2xl leading-tight">
                  {lawyer.name}
                </h2>
                <p className="text-sm text-gold-400">
                  {lawyer.title} · {lawyer.registration}
                </p>
              </div>
            </div>

            <h3 className="mt-10 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">Dónde atiendo</h3>
            <ul className="mt-4 space-y-5">
              {offices.map((office) => (
                <li key={office.id} className="flex gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden="true" />
                  <address className="not-italic">
                    <span className="block font-semibold text-white">{office.name}</span>
                    {office.street ? <span className="block">{office.street}</span> : null}
                    <span className="block">
                      {office.locality}, {office.region}
                    </span>
                  </address>
                </li>
              ))}
              {siteConfig.offersOnlineConsultations ? (
                <li className="flex gap-3">
                  <Laptop className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold text-white">Consultas en línea</span>
                    Videollamada o WhatsApp, estés donde estés.
                  </span>
                </li>
              ) : null}
            </ul>

            {officeHours.length > 0 ? (
              <div className="mt-6 flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-gold-400" aria-hidden="true" />
                <ul className="space-y-1">
                  {officeHours.map((slot) => (
                    <li key={slot.days}>
                      <span className="text-white">{slot.days}:</span> {slot.hours}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <h3 className="mt-10 text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">Contacto</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Phone className="size-5 text-gold-400" aria-hidden="true" />
                  {siteConfig.phoneDisplay}
                  <WhatsAppIcon className="size-4 text-[#25D366]" />
                </a>
              </li>
              {siteConfig.email ? (
                <li>
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="inline-flex items-center gap-3 break-all transition-colors hover:text-white"
                  >
                    <Mail className="size-5 shrink-0 text-gold-400" aria-hidden="true" />
                    {siteConfig.email}
                  </a>
                </li>
              ) : null}
              {instagram ? (
                <li>
                  <a
                    href={instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 transition-colors hover:text-white"
                  >
                    <InstagramIcon className="size-5 text-gold-400" />
                    {instagram.handle}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {mapSrc ? (
            <div className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-navy-900">
              <iframe
                title={`Mapa de la oficina de ${primaryOffice.name}`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block aspect-[4/3] w-full flex-1 border-0 grayscale-[0.4] sm:aspect-[16/10]"
                data-testid="office-map"
              />
              <p className="px-5 py-4 text-sm">
                <span className="font-semibold text-white">Oficina {primaryOffice.name}:</span> {primaryOffice.street}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-14 border-t border-white/10 pt-8 text-sm leading-relaxed text-slate-400">
          <p>
            <strong className="font-semibold text-slate-300">Aviso legal:</strong> la información de este
            sitio es de carácter general y no constituye asesoramiento jurídico. La relación abogado-cliente
            se establece únicamente mediante acuerdo expreso. Las comunicaciones enviadas a través de este
            sitio están amparadas por el secreto profesional. Resultados anteriores no garantizan
            resultados futuros.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {lawyer.name}. Todos los derechos reservados.
            </p>
            <nav aria-label="Legal" className="flex gap-5">
              <Link href="/privacidad" className="underline-offset-4 transition-colors hover:text-white hover:underline">
                Política de privacidad
              </Link>
              {isSupabaseConfigured() ? (
                <Link
                  href="/acceso"
                  rel="nofollow"
                  className="inline-flex items-center gap-1 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                  Acceso profesional
                </Link>
              ) : null}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
