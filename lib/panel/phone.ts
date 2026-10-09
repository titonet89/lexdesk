/**
 * Convierte un teléfono argentino escrito "a mano" al formato que usa WhatsApp
 * (wa.me/549 + característica sin 0 + número sin 15).
 *
 * Ejemplos: "0388 15-412-3456" → "5493884123456" · "+54 9 11 2345-6789" → "5491123456789".
 * Devuelve `null` si no se puede determinar con seguridad.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("549")) return digits.length === 13 ? digits : null;
  if (digits.startsWith("54")) {
    const national = digits.slice(2);
    return national.length === 10 ? `549${national}` : null;
  }

  if (digits.startsWith("0")) digits = digits.slice(1);

  // Formato local con "15": característica (2 a 4 dígitos) + 15 + número = 12 dígitos.
  if (digits.length === 12) {
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === "15") {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2);
        break;
      }
    }
  }

  return digits.length === 10 ? `549${digits}` : null;
}

/** Enlace a WhatsApp con un mensaje inicial opcional. */
export function whatsAppLink(phone: string | null | undefined, message?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
