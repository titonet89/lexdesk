import { redirect } from "next/navigation";
import { EnrollPasskeyOffer } from "@/components/auth/EnrollPasskeyOffer";
import { safeNextPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export default async function EnrollPasskeyPage({ searchParams }: PageProps<"/acceso/activar-huella">) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceso");

  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : null);

  // Registrar una passkey exige haber pasado contraseña + código en esta sesión.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") redirect(nextPath);

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-ink">Entrá más rápido la próxima vez</h1>
      <p className="mt-1.5 text-ink-muted">
        Activá el ingreso con tu huella, tu rostro o el PIN de este dispositivo. Ya no vas a necesitar la contraseña
        ni el código de la app en este equipo.
      </p>
      <EnrollPasskeyOffer nextPath={nextPath} />
    </>
  );
}
