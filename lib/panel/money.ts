const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const umaFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

/** "$ 892.576,00" */
export function formatARS(value: number): string {
  return arsFormatter.format(value);
}

/** "16 UMA" · "12,5 UMA" */
export function formatUma(value: number): string {
  return `${umaFormatter.format(value)} UMA`;
}

/** Redondeo a centavos (evita errores de coma flotante en sumas de dinero). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Interpreta montos escritos como en Argentina o en formato técnico:
 * "892.576,50" · "892576,5" · "892576.50" · "$ 1.000" → número, o `null` si no es válido.
 */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s$]/g, "");
  if (!cleaned) return null;
  let normalized: string;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if ((cleaned.match(/\./g) ?? []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
