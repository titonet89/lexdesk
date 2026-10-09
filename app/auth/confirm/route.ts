import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

const allowedOtpTypes: readonly EmailOtpType[] = ["recovery", "invite", "email", "email_change"];

/**
 * Destino de los enlaces de email (recuperación de contraseña e invitaciones).
 * Acepta el flujo PKCE (`code`) y el de token (`token_hash` + `type`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"), "/panel");
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type && allowedOtpTypes.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  const destination = ok ? next : "/acceso?estado=enlace-invalido";
  return NextResponse.redirect(new URL(destination, request.url));
}
