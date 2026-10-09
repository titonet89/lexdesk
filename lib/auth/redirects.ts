/**
 * Valida destinos de redirección para evitar "open redirects": solo se
 * aceptan rutas internas del panel o del flujo de acceso.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/panel"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (!/^\/(panel|acceso)(\/|$|\?)/.test(value)) return fallback;
  return value;
}
