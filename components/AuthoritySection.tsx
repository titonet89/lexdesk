import { Award, BadgeCheck, MapPin, MessageCircle, Quote, Scale, Star, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { serviceAreasLabel, siteConfig } from "@/lib/site-config";

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

interface ProfileRow {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function AuthoritySection() {
  const { lawyer, achievements, credentials, testimonials, reviews } = siteConfig;

  const profile: ProfileRow[] = [
    { icon: BadgeCheck, label: "Matrícula", value: lawyer.registration },
    { icon: MapPin, label: "Atención", value: serviceAreasLabel },
    {
      icon: Scale,
      label: "Áreas de práctica",
      value: siteConfig.practiceAreas.map((area) => area.title).join(" · "),
    },
    { icon: MessageCircle, label: "Contacto", value: `WhatsApp ${siteConfig.phoneDisplay}` },
  ];

  return (
    <section id="trayectoria" aria-labelledby="authority-title" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <Reveal>
            <p className="text-sm font-semibold tracking-[0.18em] text-gold-700 uppercase">Trayectoria</p>
            <h2 id="authority-title" className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
              Compromiso y cercanía en cada caso
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-navy-700">
              {lawyer.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {credentials.length > 0 ? (
              <ul className="mt-8 space-y-3">
                {credentials.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-navy-800">
                    <Award className="mt-0.5 size-5 shrink-0 text-gold-700" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col gap-5">
            <div
              className="rounded-3xl border border-navy-900/8 bg-slate-50 p-6 sm:p-8"
              data-testid="professional-profile"
            >
              <p className="font-serif text-2xl tracking-tight">{lawyer.name}</p>
              <p className="mt-1 text-navy-700">{lawyer.title}</p>
              <dl className="mt-6 divide-y divide-navy-900/8">
                {profile.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <Icon className="mt-0.5 size-5 shrink-0 text-gold-700" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="text-xs font-semibold tracking-[0.12em] text-navy-700/70 uppercase">{label}</dt>
                      <dd className="mt-1 text-navy-900">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            {achievements.length > 0 ? (
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-navy-900/8 bg-navy-900/8">
                {achievements.map((item) => (
                  <div key={item.label} className="bg-slate-50 p-6 sm:p-7">
                    <dt className="sr-only">{item.label}</dt>
                    <dd>
                      <span className="block font-serif text-4xl tracking-tight text-navy-900 tabular-nums sm:text-5xl">
                        {item.value}
                      </span>
                      <span className="mt-2 block text-sm leading-snug text-navy-700">{item.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {reviews ? (
              <a
                href={reviews.googleProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-3xl border border-navy-900/8 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[box-shadow,transform] duration-300 ease-(--ease-out-strong) hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgb(15_23_42/0.3)]"
                data-testid="google-reviews-badge"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-50">
                  <GoogleLogo className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-serif text-2xl leading-none">{reviews.rating.toFixed(1)}</span>
                    <span className="flex text-gold-600" aria-label={`${reviews.rating} de 5 estrellas`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                      ))}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-navy-700">
                    Basado en {reviews.count} reseñas de Google
                  </span>
                </span>
              </a>
            ) : null}
          </Reveal>
        </div>

        {testimonials.length > 0 ? (
          <ul className="mt-16 grid gap-4 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <li key={item.author}>
                <Reveal delay={index * 0.06} className="h-full">
                  <figure className="flex h-full flex-col rounded-3xl bg-navy-900 p-7 text-white">
                    <Quote className="size-7 text-gold-400" aria-hidden="true" />
                    <blockquote className="mt-4 flex-1 leading-relaxed text-slate-200">
                      “{item.quote}”
                    </blockquote>
                    <figcaption className="mt-6 border-t border-white/10 pt-4">
                      <span className="block font-semibold">{item.author}</span>
                      <span className="text-sm text-slate-400">{item.context}</span>
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
