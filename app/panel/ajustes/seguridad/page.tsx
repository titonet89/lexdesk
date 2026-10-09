import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { ProfileForm } from "@/components/panel/settings/ProfileForm";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { Badge, Card, CardHeader, PageHeader } from "@/components/panel/ui";
import { signOutEverywhereAction } from "@/lib/auth/actions";
import { requireMember } from "@/lib/auth/session";
import { formatInZone } from "@/lib/panel/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seguridad" };

export default async function SecurityPage() {
  const { profile, email, active } = await requireMember();
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = (factors?.totp ?? []).filter((factor) => factor.status === "verified");

  return (
    <>
      <PageHeader
        title="Seguridad de la cuenta"
        eyebrow={
          active.role === "titular" ? (
            <Link href="/panel/ajustes" className="inline-flex items-center gap-1 hover:text-navy-900">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Ajustes
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tus datos" />
          <div className="p-5">
            <ProfileForm fullName={profile.full_name} registration={profile.professional_registration ?? ""} email={email} />
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Verificación en dos pasos" />
            <div className="space-y-3 p-5 text-sm">
              {verifiedFactors.map((factor) => (
                <p key={factor.id} className="flex items-center gap-3 text-navy-800">
                  <ShieldCheck className="size-5 text-emerald-700" aria-hidden="true" />
                  <span className="flex-1">
                    App de autenticación
                    <span className="block text-xs text-navy-700">Activada el {formatInZone(factor.created_at, "d MMM yyyy")}</span>
                  </span>
                  <Badge tone="green">Activa</Badge>
                </p>
              ))}
              <p className="text-navy-700">
                Si perdés el celular, cerrá sesión en todos los dispositivos y pedí al soporte técnico que restablezca
                tu verificación.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sesiones" />
            <div className="p-5 text-sm text-navy-800">
              <p>Cierra tu sesión en todos los navegadores y dispositivos donde hayas ingresado.</p>
              <div className="mt-4">
                <ConfirmActionButton
                  action={signOutEverywhereAction}
                  title="¿Cerrar sesión en todos lados?"
                  description="Vas a tener que volver a ingresar con tu contraseña y tu código en todos los dispositivos."
                  confirmLabel="Cerrar todas"
                  className="rounded-full border border-navy-900/15 px-4 py-2"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Cerrar sesión en todos los dispositivos
                </ConfirmActionButton>
              </div>
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader title="Cambiar contraseña" />
          <div className="max-w-md p-5">
            <NewPasswordForm redirectTo="/panel/ajustes/seguridad" />
          </div>
        </Card>
      </div>
    </>
  );
}
