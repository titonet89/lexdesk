import type { AuthMFAGetAuthenticatorAssuranceLevelResponse } from "@supabase/supabase-js";

type Assurance = AuthMFAGetAuthenticatorAssuranceLevelResponse["data"];

/** ¿La sesión se abrió con una passkey (huella, rostro o PIN del dispositivo)? */
export function isPasskeySession(aal: Assurance): boolean {
  return Boolean(aal?.currentAuthenticationMethods.some(
      (entry) => (typeof entry === "string" ? entry : String(entry.method)) === "passkey",
    ));
}

/**
 * ¿La sesión cuenta como verificada en dos pasos?
 *
 * - Contraseña + código (AAL2), o
 * - passkey en una cuenta con 2FA activo (Supabase la emite como AAL1, pero la
 *   passkey ya exige el dispositivo y el desbloqueo biométrico).
 *
 * Es el mismo criterio que `private.has_mfa()` en la base de datos.
 */
export function isStrongSession(aal: Assurance): boolean {
  if (aal?.currentLevel === "aal2") return true;
  return aal?.nextLevel === "aal2" && isPasskeySession(aal);
}
