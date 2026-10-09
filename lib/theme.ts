/** Preferencia de tema del panel (cookie legible por el servidor para evitar parpadeos). */
export const THEME_COOKIE = "lexdesk_theme";

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}
