import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MatterForm } from "@/components/panel/matters/MatterForm";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { todayIso } from "@/lib/panel/dates";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { updateMatterAction } from "../../actions";

export const metadata: Metadata = { title: "Editar expediente" };

export default async function EditMatterPage({ params }: PageProps<"/panel/expedientes/[id]/editar">) {
  const { active: organization } = await requireTitular();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: matter }, { data: clients }] = await Promise.all([
    supabase.from("matters").select("*").eq("id", id).maybeSingle(),
    supabase.from("clients").select("id, full_name").eq("organization_id", organization.organizationId).order("full_name"),
  ]);
  if (!matter) notFound();

  return (
    <>
      <PageHeader
        title="Editar expediente"
        eyebrow={
          <Link href={`/panel/expedientes/${id}`} className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {matter.title}
          </Link>
        }
      />
      <MatterForm
        action={updateMatterAction.bind(null, id)}
        clients={clients ?? []}
        matter={matter}
        today={todayIso()}
        cancelHref={`/panel/expedientes/${id}`}
      />
    </>
  );
}
