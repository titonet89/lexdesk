"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ceremonias de passkey (WebAuthn) del lado del navegador.
 *
 * Supabase pide la verificación del usuario como "preferred". Acá la exigimos
 * ("required"): el dispositivo SIEMPRE pide huella, rostro o PIN, que es lo que
 * permite tratar la passkey como dos factores.
 */

export type PasskeyResult = { ok: true } | { ok: false; reason: "cancelled" | "unsupported" | "error"; message?: string };

interface JsonCapablePublicKeyCredential {
  parseCreationOptionsFromJSON(options: unknown): PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON(options: unknown): PublicKeyCredentialRequestOptions;
}

function jsonApi(): JsonCapablePublicKeyCredential | null {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return null;
  const api = window.PublicKeyCredential as unknown as Partial<JsonCapablePublicKeyCredential>;
  return api.parseCreationOptionsFromJSON && api.parseRequestOptionsFromJSON ? (api as JsonCapablePublicKeyCredential) : null;
}

/** ¿El navegador permite passkeys? (necesario para mostrar las opciones) */
export function supportsPasskeys(): boolean {
  return jsonApi() !== null && typeof navigator.credentials?.get === "function";
}

/** ¿Este dispositivo tiene huella, rostro o PIN propio (no solo una llave USB)? */
export async function hasPlatformAuthenticator(): Promise<boolean> {
  if (!supportsPasskeys()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function toResult(error: unknown): PasskeyResult {
  // NotAllowedError: la persona canceló o se venció el tiempo. No es un error a mostrar.
  const name = error instanceof DOMException ? error.name : (error as { cause?: DOMException })?.cause?.name;
  if (name === "NotAllowedError" || name === "AbortError") return { ok: false, reason: "cancelled" };
  if (name === "InvalidStateError") {
    return { ok: false, reason: "error", message: "Este dispositivo ya tiene una passkey para tu cuenta." };
  }
  // Los mensajes de Supabase y del navegador vienen en inglés: cada pantalla muestra el suyo.
  if (process.env.NODE_ENV !== "production") console.warn("passkey:", error);
  return { ok: false, reason: "error" };
}

/** Inicia sesión con una passkey del dispositivo. */
export async function signInWithPasskey(supabase: SupabaseClient): Promise<PasskeyResult> {
  const api = jsonApi();
  if (!api) return { ok: false, reason: "unsupported" };
  try {
    const { data: start, error: startError } = await supabase.auth.passkey.startAuthentication();
    if (startError || !start) return toResult(startError);

    const publicKey = api.parseRequestOptionsFromJSON({ ...start.options, userVerification: "required" });
    const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
    if (!credential) return { ok: false, reason: "cancelled" };

    const { error } = await supabase.auth.passkey.verifyAuthentication({
      challengeId: start.challenge_id,
      credential: credential.toJSON() as never,
    });
    return error ? toResult(error) : { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/**
 * Registra una passkey para la persona con sesión iniciada. Supabase exige una
 * sesión con contraseña + código (AAL2) cuando la cuenta tiene 2FA.
 */
export async function registerPasskey(supabase: SupabaseClient): Promise<PasskeyResult> {
  const api = jsonApi();
  if (!api) return { ok: false, reason: "unsupported" };
  try {
    const { data: start, error: startError } = await supabase.auth.passkey.startRegistration();
    if (startError || !start) return toResult(startError);

    const publicKey = api.parseCreationOptionsFromJSON({
      ...start.options,
      authenticatorSelection: { ...start.options.authenticatorSelection, residentKey: "required", userVerification: "required" },
    });
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!credential) return { ok: false, reason: "cancelled" };

    const { data, error } = await supabase.auth.passkey.verifyRegistration({
      challengeId: start.challenge_id,
      credential: credential.toJSON() as never,
    });
    if (error || !data) return toResult(error);

    // Nombre reconocible en Ajustes → Seguridad ("Android · Chrome", "Windows · Edge"…).
    await supabase.auth.passkey.update({ passkeyId: data.id, friendlyName: deviceLabel() });
    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

/** Describe el dispositivo actual en pocas palabras. */
export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const system = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPod/i.test(ua)
      ? "iPhone"
      : /iPad/i.test(ua)
        ? "iPad"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Mac OS X/i.test(ua)
            ? "Mac"
            : /Linux/i.test(ua)
              ? "Linux"
              : "Dispositivo";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/i.test(ua)
      ? "Samsung Internet"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  return browser ? `${system} · ${browser}` : system;
}

const DEVICE_KEY = "lexdesk:passkey";

/** Recuerda que en este dispositivo se usa passkey (solo una preferencia de pantalla, no da acceso). */
export function rememberPasskeyDevice(value: boolean): void {
  try {
    if (value) localStorage.setItem(DEVICE_KEY, "1");
    else localStorage.removeItem(DEVICE_KEY);
  } catch {
    // Navegación privada o almacenamiento bloqueado: se muestra la pantalla completa.
  }
}

export function usesPasskeyOnThisDevice(): boolean {
  try {
    return localStorage.getItem(DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

const OFFER_DISMISSED_KEY = "lexdesk:passkey-offer-dismissed";
const OFFER_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** "Ahora no": no volver a ofrecer la huella en este dispositivo por 30 días. */
export function dismissPasskeyOffer(): void {
  try {
    localStorage.setItem(OFFER_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Sin almacenamiento: se volverá a ofrecer en el próximo ingreso.
  }
}

/** ¿Conviene ofrecer activar la huella al terminar de ingresar con contraseña + código? */
export async function shouldOfferPasskey(): Promise<boolean> {
  if (usesPasskeyOnThisDevice()) return false;
  try {
    const dismissedAt = Number(localStorage.getItem(OFFER_DISMISSED_KEY));
    if (dismissedAt && Date.now() - dismissedAt < OFFER_SNOOZE_MS) return false;
  } catch {
    // Sin almacenamiento: se ofrece igual.
  }
  return hasPlatformAuthenticator();
}

/** Destino después de verificar el código: la oferta de huella o directamente `nextPath`. */
export async function afterVerificationPath(nextPath: string): Promise<string> {
  if (!nextPath.startsWith("/panel") || !(await shouldOfferPasskey())) return nextPath;
  return `/acceso/activar-huella?next=${encodeURIComponent(nextPath)}`;
}

export type PasskeyAvailability = "unknown" | "hidden" | "available" | "preferred";

const noSubscription = () => () => {};

function readAvailability(): PasskeyAvailability {
  if (!supportsPasskeys()) return "hidden";
  return usesPasskeyOnThisDevice() ? "preferred" : "available";
}

/**
 * ¿Mostrar el ingreso con huella? Depende del navegador, así que en el servidor
 * (y en la primera pasada de hidratación) vale "unknown".
 */
export function usePasskeyAvailability(): PasskeyAvailability {
  return useSyncExternalStore(noSubscription, readAvailability, () => "unknown");
}
