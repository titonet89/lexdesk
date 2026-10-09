import { siteConfig, type PracticeAreaId } from "@/lib/site-config";

/** Construye un enlace `wa.me` con el mensaje pre-cargado y codificado. */
export function buildWhatsAppUrl(message: string, phone: string = siteConfig.whatsappNumber): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, quisiera agendar una consulta con el estudio. ¿Me podrían indicar disponibilidad?";

export function getPracticeAreaTitle(id: PracticeAreaId): string {
  const area = siteConfig.practiceAreas.find((item) => item.id === id);
  return area ? area.title : id;
}

export function buildPracticeAreaMessage(id: PracticeAreaId): string {
  return `Hola, quisiera hacer una consulta sobre ${getPracticeAreaTitle(id)}.`;
}

export interface LeadMessageInput {
  name: string;
  phone: string;
  specialty: PracticeAreaId;
  message: string;
}

export function buildLeadMessage({ name, phone, specialty, message }: LeadMessageInput): string {
  return [
    `Hola, mi nombre es ${name.trim()}.`,
    `Quisiera hacer una consulta sobre: *${getPracticeAreaTitle(specialty)}*.`,
    "",
    message.trim(),
    "",
    `Mi WhatsApp de contacto: ${phone.trim()}`,
  ].join("\n");
}
