import type { Metadata } from "next";
import { Handshake, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { InviteForm } from "@/components/panel/collaborators/InviteForm";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { formatInZone } from "@/lib/panel/dates";
import { createClient } from "@/lib/supabase/server";
import { setCollaboratorActiveAction } from "./actions";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function CollaboratorsPage() {
  const { active: organization } = await requireTitular();
  const supabase = await createClient();
  const [{ data: memberRows }, { data: shares }] = await Promise.all([
    supabase
      .from("memberships")
      .select("user_id, is_active, created_at, profiles(full_name, email)")
      .eq("organization_id", organization.organizationId)
      .eq("role", "colaborador"),
    supabase
      .from("matter_shares")
      .select("collaborator_id, expires_at, matters!inner(organization_id)")
      .eq("matters.organization_id", organization.organizationId)
      .is("revoked_at", null),
  ]);

  const collaborators = (memberRows ?? [])
    .map((row) => ({
      id: row.user_id,
      full_name: row.profiles?.full_name ?? "",
      email: row.profiles?.email ?? "",
      is_active: row.is_active,
      created_at: row.created_at,
    }))
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));

  const activeShares = new Map<string, number>();
  for (const share of shares ?? []) {
    if (share.expires_at && new Date(share.expires_at) <= new Date()) continue;
    activeShares.set(share.collaborator_id, (activeShares.get(share.collaborator_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Colaboradores"
        description="Colegas a quienes podés compartir expedientes puntuales para pedir su opinión."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Colegas invitados" description={`${collaborators?.length ?? 0} en total`} />
          {collaborators && collaborators.length > 0 ? (
            <ul className="divide-y divide-ink/8" data-testid="collaborators-list">
              {collaborators.map((collaborator) => {
                const count = activeShares.get(collaborator.id) ?? 0;
                const name = collaborator.full_name || collaborator.email;
                return (
                  <li key={collaborator.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{name}</span>
                        {collaborator.is_active ? <Badge tone="green">Activo</Badge> : <Badge tone="neutral">Desactivado</Badge>}
                      </span>
                      <span className="block truncate text-sm text-ink-muted">
                        {collaborator.email} · {count} {count === 1 ? "expediente compartido" : "expedientes compartidos"} · desde{" "}
                        {formatInZone(collaborator.created_at, "MMM yyyy")}
                      </span>
                    </span>
                    {collaborator.is_active ? (
                      <ConfirmActionButton
                        action={setCollaboratorActiveAction.bind(null, collaborator.id, false)}
                        title={`¿Desactivar a ${name}?`}
                        description="No podrá volver a ingresar y perderá el acceso a todos los expedientes compartidos."
                        confirmLabel="Desactivar"
                        ariaLabel={`Desactivar a ${name}`}
                      >
                        <UserX className="size-4.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Desactivar</span>
                      </ConfirmActionButton>
                    ) : (
                      <form action={setCollaboratorActiveAction.bind(null, collaborator.id, true)}>
                        <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
                          <UserCheck className="size-4.5" aria-hidden="true" />
                          Reactivar
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<Handshake aria-hidden="true" />}
              title="Todavía no invitaste colegas"
              description="Invitá a un colega para poder compartirle un expediente y recibir su opinión."
            />
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="font-serif text-lg text-ink">Invitar a un colega</h2>
            <p className="mt-1 mb-4 text-sm text-ink-muted">Recibirá un email para crear su contraseña y activar su 2FA.</p>
            <InviteForm />
          </Card>
          <Card className="p-5 text-sm text-ink-soft">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <ShieldCheck className="size-4.5 text-accent-ink" aria-hidden="true" />
              Qué puede ver un colaborador
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>Solo los expedientes que le compartas, y hasta la fecha que elijas.</li>
              <li>Los documentos, únicamente si lo indicás al compartir.</li>
              <li>Nunca ve datos de clientes, tu agenda ni expedientes sensibles.</li>
              <li>Cada consulta suya queda registrada en la auditoría.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
