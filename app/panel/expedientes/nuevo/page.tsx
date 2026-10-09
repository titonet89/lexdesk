import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { MatterForm } from "@/components/panel/matters/MatterForm";
import { Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { todayIso } from "@/lib/panel/dates";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { createMatterAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo expediente" };

export default async function NewMatterPage({ searchParams }: PageProps<"/panel/expedientes/nuevo">) {
  const { active: organization } = await requireTitular();
  const { cliente } = await searchParams;
  const defaultClientId = typeof cliente === "string" && uuidSchema.safeParse(cliente).success ? cliente : undefined;

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("organization_id", organization.organizationId)
    .is("archived_at", null)
    .order("full_name");

  return (
    <>
      <PageHeader
        title="Nuevo expediente"
        eyebrow={
          <Link href="/panel/expedientes" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Expedientes
          </Link>
        }
      />
      {clients && clients.length > 0 ? (
        <MatterForm
          action={createMatterAction}
          clients={clients}
          defaultClientId={defaultClientId}
          today={todayIso()}
          cancelHref="/panel/expedientes"
        />
      ) : (
        <Card>
          <EmptyState
            icon={<Users aria-hidden="true" />}
            title="Primero cargá un cliente"
            description="Cada expediente pertenece a un cliente."
            action={
              <Link href="/panel/clientes/nuevo" className={buttonClasses("primary", "md")}>
                <Plus aria-hidden="true" />
                Nuevo cliente
              </Link>
            }
          />
        </Card>
      )}
    </>
  );
}
