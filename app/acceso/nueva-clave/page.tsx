import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { createClient } from "@/lib/supabase/server";

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceso?estado=enlace-invalido");

  // Si ya tiene 2FA configurado, primero debe verificarlo (cambiar la clave exige AAL2).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/acceso/verificar?next=/acceso/nueva-clave");
  }

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-navy-900">Crear contraseña</h1>
      <p className="mt-1.5 text-navy-700">Elegí una contraseña segura que no uses en otros sitios.</p>
      <NewPasswordForm />
    </>
  );
}
