"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Lock, MapPin, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { officesLabel, practiceAreasLabel, serviceAreasLabel, siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp";

const ease = [0.23, 1, 0.32, 1] as const;

const trustBadges = [
  { icon: BadgeCheck, label: `Matrícula ${siteConfig.lawyer.registration}` },
  { icon: MessageCircle, label: "Consulta directa por WhatsApp" },
  { icon: Lock, label: "Confidencialidad y secreto profesional" },
] as const;

export function HeroSection() {
  const { lawyer, reviews } = siteConfig;

  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-navy-900 pt-28 pb-20 text-white sm:pt-32 lg:pt-40 lg:pb-28"
    >
      {/* Fondo: resplandor ámbar sutil + grilla tenue */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-20%] -z-10 size-[42rem] rounded-full bg-gold-600/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:56px_56px]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          {reviews ? (
            <motion.a
              href={reviews.googleProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-2 text-sm text-slate-200 transition-colors duration-200 hover:border-white/30"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease }}
            >
              <span className="flex items-center gap-0.5 rounded-full bg-gold-600/15 px-2 py-0.5 text-gold-400">
                <Star className="size-3.5 fill-current" aria-hidden="true" />
                <span className="font-semibold">{reviews.rating.toFixed(1)}</span>
              </span>
              {reviews.count} reseñas en Google
            </motion.a>
          ) : (
            <motion.p
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pr-4 pl-3 text-sm text-slate-200"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease }}
            >
              <MapPin className="size-4 text-gold-400" aria-hidden="true" />
              {serviceAreasLabel}
            </motion.p>
          )}

          <motion.h1
            id="hero-title"
            className="mt-6 font-serif text-[2.6rem] leading-[1.05] font-medium tracking-tight sm:text-6xl lg:text-[4.1rem]"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease }}
          >
            Te acompaño a resolver tu situación legal con{" "}
            <em className="text-gold-400 not-italic sm:italic">claridad y compromiso</em>.
          </motion.h1>

          <motion.p
            className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease }}
          >
            {practiceAreasLabel.charAt(0).toUpperCase() + practiceAreasLabel.slice(1)}. Atención en {officesLabel}
            {siteConfig.offersOnlineConsultations ? " y consultas en línea" : ""}. Te explico tus opciones en lenguaje simple.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease }}
          >
            <ButtonLink
              href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              data-testid="hero-whatsapp-cta"
            >
              <WhatsAppIcon />
              Agendar Consulta Directa
            </ButtonLink>
            <ButtonLink href="#especialidades" variant="outline-light" size="lg" className="group">
              Conocer Especialidades
              <ArrowRight
                className="transition-transform duration-200 ease-(--ease-out-strong) group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </ButtonLink>
          </motion.div>

          <motion.ul
            className="mt-10 grid gap-3 text-sm text-slate-300 sm:flex sm:flex-wrap sm:gap-x-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {trustBadges.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4.5 text-gold-400" aria-hidden="true" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* Retrato profesional (placeholder hasta contar con la foto real) */}
        <motion.figure
          className="relative mx-auto w-full max-w-sm lg:max-w-none"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)]">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-gold-600/20 to-transparent"
            />
            {/* Monograma de marca (reemplazar por la foto profesional cuando esté disponible) */}
            <div
              role="img"
              aria-label={`Monograma de ${lawyer.name}`}
              className="absolute inset-0 flex flex-col items-center justify-center px-8 pb-10"
            >
              <div className="grid size-44 place-items-center rounded-full border border-gold-600/45 bg-navy-950/40 sm:size-52">
                <span className="font-serif text-6xl tracking-tight text-gold-400 sm:text-7xl">{lawyer.monogram}</span>
              </div>
              <div className="mt-8 flex w-full max-w-60 items-center gap-3 text-gold-400/80" aria-hidden="true">
                <span className="h-px flex-1 bg-gold-600/40" />
                <span className="text-xs font-medium tracking-[0.4em] uppercase">Abogada</span>
                <span className="h-px flex-1 bg-gold-600/40" />
              </div>
            </div>
          </div>

          <figcaption className="absolute -bottom-6 left-1/2 w-[88%] -translate-x-1/2 rounded-2xl border border-white/10 bg-navy-900/90 p-4 backdrop-blur-xl sm:-left-6 sm:w-auto sm:translate-x-0">
            <p className="font-serif text-lg leading-tight">{lawyer.name}</p>
            <p className="mt-0.5 text-sm text-slate-400">{lawyer.title}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gold-400">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {lawyer.registration}
            </p>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
