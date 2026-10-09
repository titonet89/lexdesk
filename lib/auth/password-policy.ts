/** Política de contraseñas (debe coincidir con supabase/config.toml y la configuración del proyecto). */
export const passwordRules = [
  { id: "length", label: "Al menos 12 caracteres", test: (value: string) => value.length >= 12 },
  { id: "lower", label: "Una letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { id: "upper", label: "Una letra mayúscula", test: (value: string) => /[A-Z]/.test(value) },
  { id: "digit", label: "Un número", test: (value: string) => /\d/.test(value) },
] as const;

export function isPasswordValid(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value));
}
