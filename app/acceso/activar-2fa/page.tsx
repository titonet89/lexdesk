import { redirect } from "next/navigation";
import { EnrollTotpForm } from "@/components/auth/EnrollTotpForm";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { isStrongSession } from "@/lib/auth/assurance";
import { createClient } from "@/lib/supabase/server";

export default async function EnrollPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceso");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2") {
    redirect(isStrongSession(aal) ? "/panel" : "/acceso/verificar");
  }

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-ink">Activá la verificación en dos pasos</h1>
      <p className="mt-1.5 text-ink-muted">
        Es obligatoria para proteger la información de tus clientes. Lleva un minuto.
      </p>
      <EnrollTotpForm />
      <div className="mt-6 border-t border-ink/8 pt-4 text-center">
        <SignOutButton variant="link" />
      </div>
    </>
  );
}
