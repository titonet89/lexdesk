import { redirect } from "next/navigation";
import { VerifyTotpForm } from "@/components/auth/VerifyTotpForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyPage({ searchParams }: PageProps<"/acceso/verificar">) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceso");

  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal1") redirect("/acceso/activar-2fa");
  if (aal?.currentLevel === "aal2") redirect(nextPath);

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-ink">Verificación en dos pasos</h1>
      <p className="mt-1.5 text-ink-muted">
        Abrí tu app de autenticación (Google Authenticator, Microsoft Authenticator, Authy…) e ingresá el
        código de 6 dígitos.
      </p>
      <VerifyTotpForm nextPath={nextPath} />
      <div className="mt-6 border-t border-ink/8 pt-4 text-center">
        <SignOutButton variant="link" />
      </div>
    </>
  );
}
