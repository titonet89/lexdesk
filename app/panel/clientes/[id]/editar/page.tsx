import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/panel/clients/ClientForm";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { updateClientAction } from "../../actions";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditClientPage({ params }: PageProps<"/panel/clientes/[id]/editar">) {
  await requireTitular();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();

  return (
    <>
      <PageHeader
        title="Editar cliente"
        eyebrow={
          <Link href={`/panel/clientes/${id}`} className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {client.full_name}
          </Link>
        }
      />
      <ClientForm action={updateClientAction.bind(null, id)} client={client} cancelHref={`/panel/clientes/${id}`} />
    </>
  );
}
