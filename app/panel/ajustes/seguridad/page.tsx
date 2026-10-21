import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Fingerprint, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { AddPasskeyButton } from "@/components/panel/settings/AddPasskeyButton";
import { ProfileForm } from "@/components/panel/settings/ProfileForm";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { Badge, Card, CardHeader, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { deletePasskeyAction, signOutEverywhereAction } from "@/lib/auth/actions";
import { requireMember } from "@/lib/auth/session";
import { formatInZone } from "@/lib/panel/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Seguridad" };

export default async function SecurityPage() {
  const { profile, email, active, userId } = await requireMember();
  const supabase = await createClient();
  const [{ data: factors }, { data: aal }, { data: passkeys }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    // Con la clave secreta: Supabase no deja listar passkeys a quien ingresó con huella.
    createAdminClient().auth.admin.passkey.listPasskeys({ userId }),
  ]);
  // Agregar passkeys o cambiar la contraseña exige contraseña + código en esta sesión.
  const hasCodeVerified = aal?.currentLevel === "aal2";
  const verifiedFactors = (factors?.totp ?? []).filter((factor) => factor.status === "verified");

  return (
    <>
      <PageHeader
        title="Seguridad de la cuenta"
        eyebrow={
          active.role === "titular" ? (
            <Link href="/panel/ajustes" className="inline-flex items-center gap-1 hover:text-ink">
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
                <p key={factor.id} className="flex items-center gap-3 text-ink-soft">
                  <ShieldCheck className="size-5 text-success-ink" aria-hidden="true" />
                  <span className="flex-1">
                    App de autenticación
                    <span className="block text-xs text-ink-muted">Activada el {formatInZone(factor.created_at, "d MMM yyyy")}</span>
                  </span>
                  <Badge tone="green">Activa</Badge>
                </p>
              ))}
              <p className="text-ink-muted">
                Si perdés el celular, cerrá sesión en todos los dispositivos y pedí al soporte técnico que restablezca
                tu verificación.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Ingreso con huella o rostro"
              description="Entrá sin contraseña ni código en tus dispositivos de confianza."
            />
            <div className="space-y-4 p-5 text-sm">
              {passkeys && passkeys.length > 0 ? (
                <ul className="space-y-3" aria-label="Dispositivos con huella activada">
                  {passkeys.map((passkey) => (
                    <li key={passkey.id} className="flex items-center gap-3 text-ink-soft">
                      <Fingerprint className="size-5 text-success-ink" aria-hidden="true" />
                      <span className="flex-1">
                        {passkey.friendly_name ?? "Dispositivo"}
                        <span className="block text-xs text-ink-muted">
                          Activado el {formatInZone(passkey.created_at, "d MMM yyyy")}
                          {passkey.last_used_at ? ` · último uso el ${formatInZone(passkey.last_used_at, "d MMM yyyy")}` : ""}
                        </span>
                      </span>
                      <ConfirmActionButton
                        action={deletePasskeyAction.bind(null, passkey.id)}
                        title="¿Quitar este dispositivo?"
                        description="Ya no se va a poder ingresar con huella desde ese dispositivo. Podés volver a activarlo cuando quieras."
                        confirmLabel="Quitar"
                        ariaLabel={`Quitar ${passkey.friendly_name ?? "dispositivo"}`}
                        className="rounded-lg p-2"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </ConfirmActionButton>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-muted">Todavía no activaste la huella en ningún dispositivo.</p>
              )}
              <AddPasskeyButton canRegister={hasCodeVerified} />
              <p className="text-ink-muted">
                Si perdés un dispositivo, quitalo de esta lista y cerrá sesión en todos los dispositivos.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Sesiones" />
            <div className="p-5 text-sm text-ink-soft">
              <p>Cierra tu sesión en todos los navegadores y dispositivos donde hayas ingresado.</p>
              <div className="mt-4">
                <ConfirmActionButton
                  action={signOutEverywhereAction}
                  title="¿Cerrar sesión en todos lados?"
                  description="Vas a tener que volver a ingresar con tu contraseña y tu código en todos los dispositivos."
                  confirmLabel="Cerrar todas"
                  className="rounded-full border border-ink/15 px-4 py-2"
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
            {hasCodeVerified ? (
              <NewPasswordForm redirectTo="/panel/ajustes/seguridad" />
            ) : (
              <div className="space-y-4 text-sm text-ink-soft">
                <p>Ingresaste con tu huella. Para cambiar la contraseña, primero confirmá con el código de tu app.</p>
                <Link href="/acceso/verificar?next=/panel/ajustes/seguridad" className={buttonClasses("secondary", "sm")}>
                  <ShieldCheck aria-hidden="true" />
                  Confirmar con el código para cambiar la contraseña
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
