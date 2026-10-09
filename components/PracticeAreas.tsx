"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Briefcase,
  Check,
  HeartHandshake,
  Landmark,
  Phone,
  ScrollText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { siteConfig, type PracticeAreaId } from "@/lib/site-config";
import { buildPracticeAreaMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const icons: Record<PracticeAreaId, LucideIcon> = {
  familia: UsersRound,
  sucesiones: ScrollText,
  civil: Landmark,
  laboral: Briefcase,
  "violencia-genero": HeartHandshake,
};

const ease = [0.23, 1, 0.32, 1] as const;

export function PracticeAreas() {
  return (
    <section id="especialidades" aria-labelledby="areas-title" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-gold-700 uppercase">Especialidades</p>
          <h2 id="areas-title" className="mt-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            Soluciones legales concretas para cada situación
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-navy-700">
            Elegí tu área y escribime directamente por WhatsApp para contarme tu caso.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {siteConfig.practiceAreas.map((area, index) => {
            const Icon = icons[area.id];
            return (
              <motion.li
                key={area.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.5, delay: index * 0.06, ease }}
                className="group relative flex flex-col rounded-3xl border border-navy-900/8 bg-white p-6 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-[box-shadow,border-color,transform] duration-300 ease-(--ease-out-strong) hover:-translate-y-1 hover:border-gold-600/30 hover:shadow-[0_24px_48px_-24px_rgb(15_23_42/0.25)] sm:p-8"
                data-testid="practice-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-300 group-hover:bg-gold-600 group-hover:text-navy-950">
                    <Icon className="size-5.5" aria-hidden="true" />
                  </span>
                  <span className="font-serif text-sm text-navy-700/50 tabular-nums">0{index + 1}</span>
                </div>

                <h3 className="mt-6 font-serif text-2xl tracking-tight">{area.title}</h3>
                <p className="mt-2 leading-relaxed text-navy-700">{area.summary}</p>

                <ul className="mt-5 space-y-2 text-[15px] text-navy-800">
                  {area.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>

                {area.notice ? (
                  <p className="mt-5 flex items-start gap-2 rounded-2xl bg-gold-50 px-4 py-3 text-sm leading-snug text-navy-800">
                    <Phone className="mt-0.5 size-4 shrink-0 text-gold-700" aria-hidden="true" />
                    {area.notice}
                  </p>
                ) : null}

                <a
                  href={buildWhatsAppUrl(buildPracticeAreaMessage(area.id))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-navy-900/5 px-4 text-sm font-semibold text-navy-900 transition-[background-color,color,transform] duration-200 ease-(--ease-out-strong) hover:bg-navy-900 hover:text-white active:scale-[0.97]"
                  aria-label={`Consultar por WhatsApp sobre ${area.title}`}
                >
                  Consultar este caso
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
