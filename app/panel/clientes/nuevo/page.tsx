import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/panel/clients/ClientForm";
import { PageHeader } from "@/components/panel/ui";
import { requireTitular } from "@/lib/auth/session";
import { createClientAction } from "../actions";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  await requireTitular();
  return (
    <>
      <PageHeader
        title="Nuevo cliente"
        eyebrow={
          <Link href="/panel/clientes" className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Clientes
          </Link>
        }
      />
      <ClientForm action={createClientAction} cancelHref="/panel/clientes" />
    </>
  );
}
