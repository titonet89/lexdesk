"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppUrl, DEFAULT_WHATSAPP_MESSAGE } from "@/lib/whatsapp";

export function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Aparece después de que el usuario pasa el hero, para no competir con el CTA principal.
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.a
          href={buildWhatsAppUrl(DEFAULT_WHATSAPP_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribir por WhatsApp. En línea, respuesta rápida"
          data-testid="floating-whatsapp"
          className="group fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex items-center gap-3 sm:right-6 sm:bottom-6"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          whileTap={{ scale: 0.94 }}
        >
          <span className="hidden items-center gap-2 rounded-full bg-white py-2 pr-4 pl-3 text-sm font-medium text-navy-900 shadow-[0_10px_30px_-10px_rgb(15_23_42/0.35)] sm:flex">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-500" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            En línea · Respuesta rápida
          </span>
          <span className="relative grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgb(37_211_102/0.6)] transition-transform duration-200 ease-(--ease-out-strong) group-hover:scale-105">
            <WhatsAppIcon className="size-7" />
            <span className="absolute -top-0.5 -right-0.5 flex size-4">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex size-4 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          </span>
        </motion.a>
      ) : null}
    </AnimatePresence>
  );
}
