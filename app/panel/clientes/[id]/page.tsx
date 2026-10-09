import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowLeft, FolderOpen, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly } from "@/lib/panel/dates";
import { matterStatusLabels, matterStatusTones, practiceAreaLabels } from "@/lib/panel/labels";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { toggleArchiveClientAction } from "../actions";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientDetailPage({ params }: PageProps<"/panel/clientes/[id]">) {
  await requireTitular();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: client }, { data: matters }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("matters")
      .select("id, title, file_number, area, status, opened_on")
      .eq("client_id", id)
      .order("opened_on", { ascending: false }),
  ]);
  if (!client) notFound();

  const archived = Boolean(client.archived_at);
  const contactRows = [
    { icon: Phone, value: client.phone, href: client.phone ? `tel:${client.phone.replace(/[^\d+]/g, "")}` : null },
    { icon: Mail, value: client.email, href: client.email ? `mailto:${client.email}` : null },
    { icon: MapPin, value: [client.address, client.locality].filter(Boolean).join(", ") || null, href: null },
  ].filter((row) => row.value);

  return (
    <>
      <PageHeader
        title={client.full_name}
        eyebrow={
          <Link href="/panel/clientes" className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Clientes
          </Link>
        }
        description={
          client.document_number ? `${client.document_type ?? "Documento"} ${client.document_number}` : undefined
        }
        actions={
          <>
            <Link href={`/panel/clientes/${id}/editar`} className={buttonClasses("ghost", "md", "border border-navy-900/15")}>
              <Pencil aria-hidden="true" />
              Editar
            </Link>
            <Link href={`/panel/expedientes/nuevo?cliente=${id}`} className={buttonClasses("primary", "md")}>
              <Plus aria-hidden="true" />
              Nuevo expediente
            </Link>
          </>
        }
      />

      {archived ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Este cliente está archivado.</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardHeader title="Contacto" />
          <div className="space-y-3 p-5 text-sm">
            {contactRows.length > 0 ? (
              contactRows.map(({ icon: Icon, value, href }) => (
                <p key={value} className="flex items-start gap-3 text-navy-800">
                  <Icon className="mt-0.5 size-4 shrink-0 text-gold-700" aria-hidden="true" />
                  {href ? (
                    <a href={href} className="break-all underline-offset-4 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <span>{value}</span>
                  )}
                </p>
              ))
            ) : (
              <p className="text-navy-700">Sin datos de contacto.</p>
            )}
            {client.notes ? (
              <div className="border-t border-navy-900/8 pt-3">
                <p className="text-xs font-semibold tracking-wide text-navy-700/70 uppercase">Notas</p>
                <p className="mt-1 whitespace-pre-line text-navy-800">{client.notes}</p>
              </div>
            ) : null}
            <form
              action={async () => {
                "use server";
                await toggleArchiveClientAction(id, !archived);
              }}
              className="border-t border-navy-900/8 pt-3"
            >
              <button type="submit" className="inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-navy-900">
                <Archive className="size-4" aria-hidden="true" />
                {archived ? "Desarchivar cliente" : "Archivar cliente"}
              </button>
            </form>
          </div>
        </Card>

        <Card>
          <CardHeader title="Expedientes" description={`${matters?.length ?? 0} en total`} />
          {matters && matters.length > 0 ? (
            <ul className="divide-y divide-navy-900/8">
              {matters.map((matter) => (
                <li key={matter.id}>
                  <Link href={`/panel/expedientes/${matter.id}`} className="block px-5 py-4 transition-colors hover:bg-slate-50">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy-900">{matter.title}</span>
                      <Badge tone={matterStatusTones[matter.status]}>{matterStatusLabels[matter.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-navy-700">
                      {practiceAreaLabels[matter.area]}
                      {matter.file_number ? ` · Expte. ${matter.file_number}` : ""} · Desde{" "}
                      {formatDateOnly(matter.opened_on, "d MMM yyyy")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<FolderOpen aria-hidden="true" />} title="Sin expedientes" description="Este cliente todavía no tiene expedientes." />
          )}
        </Card>
      </div>
    </>
  );
}
