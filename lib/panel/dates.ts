import { TZDate } from "@date-fns/tz";
import { addDays, format, isWeekend } from "date-fns";
import { es } from "date-fns/locale";

/** Zona horaria del estudio (Jujuy, UTC−3 sin horario de verano). */
export const TIME_ZONE = "America/Argentina/Jujuy";

/** Fecha y hora actuales en la zona del estudio. */
export function nowInZone(): TZDate {
  return TZDate.tz(TIME_ZONE);
}

/** Fecha de hoy en la zona del estudio, formato ISO `yyyy-MM-dd`. */
export function todayIso(): string {
  return format(nowInZone(), "yyyy-MM-dd");
}

/** Convierte un instante (ISO o Date) a la zona del estudio. */
export function inZone(value: string | Date): TZDate {
  return new TZDate(new Date(value).getTime(), TIME_ZONE);
}

/** Formatea un instante en la zona del estudio con locale español. */
export function formatInZone(value: string | Date, pattern: string): string {
  return format(inZone(value), pattern, { locale: es });
}

/** Formatea una fecha calendario `yyyy-MM-dd` (sin hora) con locale español. */
export function formatDateOnly(value: string, pattern = "d 'de' MMMM 'de' yyyy"): string {
  return format(parseDateOnly(value), pattern, { locale: es });
}

/** Interpreta `yyyy-MM-dd` como fecha calendario (mediodía, para evitar saltos de zona). */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Convierte la fecha y hora ingresadas en un formulario (hora de Jujuy) a un
 * instante ISO en UTC para guardar en la base.
 */
export function zonedInputToIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  // Se normaliza a UTC ("Z") para guardar siempre el mismo formato.
  return new Date(new TZDate(year, month - 1, day, hours, minutes, TIME_ZONE).getTime()).toISOString();
}

/** Inversa de `zonedInputToIso`: separa un instante en fecha y hora locales para un formulario. */
export function isoToZonedInput(value: string): { date: string; time: string } {
  const zoned = inZone(value);
  return { date: format(zoned, "yyyy-MM-dd"), time: format(zoned, "HH:mm") };
}

export function isBusinessDay(date: Date, nonWorkingDays: ReadonlySet<string>): boolean {
  return !isWeekend(date) && !nonWorkingDays.has(toDateOnly(date));
}

/**
 * Cómputo de plazos procesales en días hábiles.
 *
 * El plazo empieza a correr el día hábil siguiente al de la notificación
 * (`from`), y se saltean sábados, domingos y los días inhábiles cargados
 * (feriados y ferias judiciales). Devuelve el día de vencimiento.
 *
 * Nota: no contempla el plazo de gracia (cargo) de las primeras horas del día
 * hábil siguiente, que se informa aparte en la interfaz.
 */
export function addBusinessDaysFrom(
  from: string,
  businessDays: number,
  nonWorkingDays: ReadonlySet<string>,
): { dueDate: string; skipped: string[] } {
  if (!Number.isInteger(businessDays) || businessDays < 1) {
    throw new RangeError("La cantidad de días hábiles debe ser un entero positivo.");
  }
  let cursor = parseDateOnly(from);
  let counted = 0;
  const skipped: string[] = [];
  while (counted < businessDays) {
    cursor = addDays(cursor, 1);
    if (isBusinessDay(cursor, nonWorkingDays)) {
      counted += 1;
    } else if (!isWeekend(cursor)) {
      skipped.push(toDateOnly(cursor));
    }
  }
  return { dueDate: toDateOnly(cursor), skipped };
}

/** Días calendario entre hoy (zona del estudio) y una fecha; negativo si ya pasó. */
export function daysUntil(value: string | Date): number {
  const target = inZone(value);
  const today = nowInZone();
  const startOf = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOf(target) - startOf(today)) / 86_400_000);
}

export function relativeDayLabel(value: string | Date): string {
  const days = daysUntil(value);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";
  if (days > 1) return `En ${days} días`;
  return `Hace ${Math.abs(days)} días`;
}
