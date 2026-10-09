"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#especialidades", label: "Especialidades" },
  { href: "#trayectoria", label: "Trayectoria" },
  { href: "#consulta", label: "Consulta" },
  { href: "#contacto", label: "Contacto" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappUrl = buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-(--ease-out-strong)",
        scrolled
          ? "bg-navy-900/95 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-20">
        <a
          href="#inicio"
          className="flex items-center gap-2.5 text-white"
          aria-label={`${siteConfig.lawyer.name} — inicio`}
        >
          <BrandMark />
          <span className="flex flex-col">
            <span className="font-serif text-lg leading-none tracking-tight">{siteConfig.lawyer.shortName}</span>
            <span className="mt-1 text-[10px] font-medium tracking-[0.3em] text-gold-400 uppercase">Abogada</span>
          </span>
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <ButtonLink href={whatsappUrl} target="_blank" rel="noopener noreferrer" size="sm">
            <WhatsAppIcon />
            Agendar consulta
          </ButtonLink>
        </nav>

        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            className="grid size-11 place-items-center rounded-full text-white transition-transform duration-150 active:scale-[0.94] lg:hidden"
            aria-label="Abrir menú"
            data-testid="mobile-menu-trigger"
          >
            <Menu className="size-6" aria-hidden="true" />
          </Dialog.Trigger>
          <AnimatePresence>
            {open ? (
              <Dialog.Portal forceMount>
                <Dialog.Overlay asChild forceMount>
                  <motion.div
                    className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </Dialog.Overlay>
                <Dialog.Content asChild forceMount>
                  <motion.div
                    data-testid="mobile-menu"
                    className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col bg-navy-900 px-6 pt-5 pb-8 text-white shadow-2xl"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
                  >
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="font-serif text-xl">Menú</Dialog.Title>
                      <Dialog.Close
                        className="grid size-11 place-items-center rounded-full transition-transform duration-150 active:scale-[0.94]"
                        aria-label="Cerrar menú"
                      >
                        <X className="size-6" aria-hidden="true" />
                      </Dialog.Close>
                    </div>
                    <Dialog.Description className="sr-only">
                      Navegación principal del sitio
                    </Dialog.Description>
                    <nav aria-label="Móvil" className="mt-8 flex flex-col">
                      {navLinks.map((link, index) => (
                        <motion.a
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="border-b border-white/10 py-4 font-serif text-2xl"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.06 + index * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        >
                          {link.label}
                        </motion.a>
                      ))}
                    </nav>
                    <div className="mt-auto space-y-3">
                      <ButtonLink
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="lg"
                        className="w-full"
                      >
                        <WhatsAppIcon />
                        Agendar Consulta Directa
                      </ButtonLink>
                      <p className="text-center text-sm text-slate-400">{siteConfig.phoneDisplay}</p>
                    </div>
                  </motion.div>
                </Dialog.Content>
              </Dialog.Portal>
            ) : null}
          </AnimatePresence>
        </Dialog.Root>
      </div>
    </header>
  );
}
