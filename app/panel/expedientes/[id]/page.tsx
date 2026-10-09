import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  Lock,
  MessageSquare,
  Paperclip,
  Pencil,
  ScrollText,
  Trash,
  UserX,
} from "lucide-react";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { CommentForm } from "@/components/panel/matters/CommentForm";
import { DocumentDownloadButton } from "@/components/panel/matters/DocumentDownloadButton";
import { DocumentUploader } from "@/components/panel/matters/DocumentUploader";
import { EntryForm } from "@/components/panel/matters/EntryForm";
import { ShareForm } from "@/components/panel/matters/ShareForm";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { isTitularOf, requireMember } from "@/lib/auth/session";
import { formatDateOnly, formatInZone, relativeDayLabel, todayIso } from "@/lib/panel/dates";
import { formatBytes } from "@/lib/panel/documents";
import {
  entryKindLabels,
  eventKindLabels,
  eventKindTones,
  eventStatusLabels,
  matterStatusLabels,
  matterStatusTones,
  practiceAreaLabels,
  sharePermissionLabels,
} from "@/lib/panel/labels";
import { uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { deleteDocumentAction, deleteEntryAction, revokeShareAction } from "../actions";

export const metadata: Metadata = { title: "Expediente" };

type Section = "resumen" | "actuaciones" | "agenda" | "documentos" | "colaboracion";

export default async function MatterDetailPage({ params, searchParams }: PageProps<"/panel/expedientes/[id]">) {
  const session = await requireMember();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  // RLS: la titular ve todo; un colaborador solo si se lo compartieron.
  const { data: matter } = await supabase
    .from("matters")
    .select("*, clients(id, full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!matter) notFound();
  // Titular del estudio AL QUE PERTENECE el expediente (no necesariamente el activo).
  const isTitular = isTitularOf(session, matter.organization_id);

  let ownShare: { permission: "lectura" | "comentario"; include_documents: boolean; expires_at: string | null } | null = null;
  if (!isTitular) {
    const { data } = await supabase
      .from("matter_shares")
      .select("permission, include_documents, expires_at")
      .eq("matter_id", id)
      .is("revoked_at", null)
      .maybeSingle();
    ownShare = data;
    // Cada consulta de un colaborador queda registrada.
    await supabase.rpc("log_access", { p_table_name: "matters", p_record_id: id, p_action: "view" });
  }

  const canSeeDocuments = isTitular || Boolean(ownShare?.include_documents);
  const canComment = isTitular || ownShare?.permission === "comentario";

  const sections: { id: Section; label: string; visible: boolean }[] = [
    { id: "resumen", label: "Resumen", visible: true },
    { id: "actuaciones", label: "Actuaciones", visible: true },
    { id: "agenda", label: "Agenda", visible: isTitular },
    { id: "documentos", label: "Documentos", visible: canSeeDocuments },
    { id: "colaboracion", label: isTitular ? "Colaboración" : "Observaciones", visible: true },
  ];
  const visibleSections = sections.filter((section) => section.visible);
  const { seccion } = await searchParams;
  const active: Section = visibleSections.find((section) => section.id === seccion)?.id ?? "resumen";

  return (
    <>
      <PageHeader
        title={matter.title}
        eyebrow={
          <Link href={isTitular ? "/panel/expedientes" : "/panel"} className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            {isTitular ? "Expedientes" : "Compartidos conmigo"}
          </Link>
        }
        description={[
          practiceAreaLabels[matter.area],
          matter.file_number ? `Expte. ${matter.file_number}` : null,
          matter.court,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          isTitular ? (
            <>
              <Link href={`/panel/agenda/nuevo?expediente=${id}`} className={buttonClasses("ghost", "md", "border border-navy-900/15")}>
                <CalendarPlus aria-hidden="true" />
                Agendar
              </Link>
              <Link href={`/panel/expedientes/${id}/editar`} className={buttonClasses("primary", "md")}>
                <Pencil aria-hidden="true" />
                Editar
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={matterStatusTones[matter.status]}>{matterStatusLabels[matter.status]}</Badge>
        {matter.is_sensitive ? (
          <Badge tone="gold">
            <Lock className="size-3" aria-hidden="true" />
            Sensible
          </Badge>
        ) : null}
        {!isTitular && ownShare ? (
          <Badge tone="blue">
            {sharePermissionLabels[ownShare.permission]}
            {ownShare.expires_at ? ` · hasta ${formatInZone(ownShare.expires_at, "d MMM")}` : ""}
          </Badge>
        ) : null}
      </div>

      <nav aria-label="Secciones del expediente" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl bg-navy-900/5 p-1">
          {visibleSections.map((section) => (
            <li key={section.id}>
              <Link
                href={`/panel/expedientes/${id}?seccion=${section.id}`}
                aria-current={active === section.id ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active === section.id ? "bg-white text-navy-900 shadow-sm" : "text-navy-700 hover:text-navy-900",
                )}
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {active === "resumen" ? <SummarySection matter={matter} isTitular={isTitular} /> : null}
      {active === "actuaciones" ? <EntriesSection matterId={id} isTitular={isTitular} /> : null}
      {active === "agenda" && isTitular ? <AgendaSection matterId={id} /> : null}
      {active === "documentos" && canSeeDocuments ? <DocumentsSection matterId={id} isTitular={isTitular} /> : null}
      {active === "colaboracion" ? (
        <CollaborationSection
          matterId={id}
          organizationId={matter.organization_id}
          currentUserId={session.userId}
          isTitular={isTitular}
          canComment={canComment}
          isSensitive={matter.is_sensitive}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------

interface MatterWithClient {
  client_id: string;
  clients: { id: string; full_name: string } | null;
  jurisdiction: string;
  counterpart: string | null;
  opened_on: string;
  closed_on: string | null;
  description: string | null;
}

function SummarySection({ matter, isTitular }: { matter: MatterWithClient; isTitular: boolean }) {
  const rows = [
    {
      label: "Cliente",
      value: isTitular && matter.clients ? (
        <Link href={`/panel/clientes/${matter.clients.id}`} className="font-medium text-gold-700 hover:underline">
          {matter.clients.full_name}
        </Link>
      ) : null,
    },
    { label: "Contraparte", value: matter.counterpart },
    { label: "Jurisdicción", value: matter.jurisdiction },
    { label: "Inicio", value: formatDateOnly(matter.opened_on) },
    { label: "Cierre", value: matter.closed_on ? formatDateOnly(matter.closed_on) : null },
  ].filter((row) => row.value);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Card className="h-fit">
        <CardHeader title="Datos" />
        <dl className="divide-y divide-navy-900/8">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 px-5 py-3 text-sm">
              <dt className="text-navy-700">{row.label}</dt>
              <dd className="text-right text-navy-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader title="Descripción y estrategia" />
        <div className="p-5">
          {matter.description ? (
            <p className="leading-relaxed whitespace-pre-line text-navy-800">{matter.description}</p>
          ) : (
            <p className="text-navy-700">Sin descripción.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

async function EntriesSection({ matterId, isTitular }: { matterId: string; isTitular: boolean }) {
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("matter_entries")
    .select("id, occurred_on, kind, summary, details")
    .eq("matter_id", matterId)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      {isTitular ? (
        <Card className="p-5">
          <EntryForm matterId={matterId} today={todayIso()} />
        </Card>
      ) : null}
      <Card>
        <CardHeader title="Historial de actuaciones" description={`${entries?.length ?? 0} registradas`} />
        {entries && entries.length > 0 ? (
          <ol className="relative px-5 py-4" data-testid="entries-list">
            {entries.map((entry) => (
              <li key={entry.id} className="relative border-l-2 border-gold-600/30 pb-6 pl-6 last:pb-1">
                <span className="absolute top-1 -left-[7px] size-3 rounded-full border-2 border-white bg-gold-600" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  <time dateTime={entry.occurred_on} className="text-sm font-semibold text-navy-900">
                    {formatDateOnly(entry.occurred_on, "d MMM yyyy")}
                  </time>
                  <Badge>{entryKindLabels[entry.kind]}</Badge>
                  {isTitular ? (
                    <ConfirmActionButton
                      action={deleteEntryAction.bind(null, matterId, entry.id)}
                      title="¿Eliminar esta actuación?"
                      description="La eliminación queda registrada en la auditoría."
                      confirmLabel="Eliminar"
                      className="ml-auto"
                      ariaLabel={`Eliminar actuación: ${entry.summary}`}
                    >
                      <Trash className="size-4" aria-hidden="true" />
                    </ConfirmActionButton>
                  ) : null}
                </div>
                <p className="mt-1 font-medium text-navy-900">{entry.summary}</p>
                {entry.details ? <p className="mt-1 text-sm whitespace-pre-line text-navy-700">{entry.details}</p> : null}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon={<ScrollText aria-hidden="true" />} title="Sin actuaciones" description="Registrá escritos, audiencias, notificaciones y resoluciones." />
        )}
      </Card>
    </div>
  );
}

async function AgendaSection({ matterId }: { matterId: string }) {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, kind, status, starts_at, all_day")
    .eq("matter_id", matterId)
    .order("starts_at", { ascending: false });

  return (
    <Card>
      <CardHeader
        title="Agenda del expediente"
        action={
          <Link href={`/panel/agenda/nuevo?expediente=${matterId}`} className={buttonClasses("primary", "sm")}>
            <CalendarPlus aria-hidden="true" />
            Agendar
          </Link>
        }
      />
      {events && events.length > 0 ? (
        <ul className="divide-y divide-navy-900/8">
          {events.map((event) => (
            <li key={event.id}>
              <Link href={`/panel/agenda/${event.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-medium text-navy-900", event.status !== "pendiente" && "text-navy-700 line-through")}>
                      {event.title}
                    </span>
                    <Badge tone={eventKindTones[event.kind]}>{eventKindLabels[event.kind]}</Badge>
                    {event.status !== "pendiente" ? <Badge>{eventStatusLabels[event.status]}</Badge> : null}
                  </span>
                  <span className="text-sm text-navy-700">
                    {formatInZone(event.starts_at, event.all_day ? "EEEE d MMM yyyy" : "EEEE d MMM yyyy · HH:mm 'h'")} ·{" "}
                    {relativeDayLabel(event.starts_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<CalendarPlus aria-hidden="true" />} title="Sin eventos" description="Agendá audiencias y vencimientos de este expediente." />
      )}
    </Card>
  );
}

async function DocumentsSection({ matterId, isTitular }: { matterId: string; isTitular: boolean }) {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, mime_type, size_bytes, created_at")
    .eq("matter_id", matterId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      {isTitular ? <DocumentUploader matterId={matterId} /> : null}
      <Card>
        <CardHeader title="Documentos" description="Las descargas generan un enlace temporal y quedan registradas." />
        {documents && documents.length > 0 ? (
          <ul className="divide-y divide-navy-900/8" data-testid="documents-list">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="size-5 shrink-0 text-gold-700" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-navy-900">{document.name}</span>
                  <span className="text-xs text-navy-700">
                    {formatBytes(document.size_bytes)} · {formatInZone(document.created_at, "d MMM yyyy")}
                  </span>
                </span>
                <DocumentDownloadButton documentId={document.id} name={document.name} />
                {isTitular ? (
                  <ConfirmActionButton
                    action={deleteDocumentAction.bind(null, matterId, document.id)}
                    title="¿Eliminar este documento?"
                    description={`Se borrará “${document.name}” de forma definitiva.`}
                    confirmLabel="Eliminar"
                    className="grid size-9 place-items-center"
                    ariaLabel={`Eliminar ${document.name}`}
                  >
                    <Trash className="size-4.5" aria-hidden="true" />
                  </ConfirmActionButton>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Paperclip aria-hidden="true" />} title="Sin documentos" />
        )}
      </Card>
    </div>
  );
}

async function CollaborationSection({
  matterId,
  organizationId,
  currentUserId,
  isTitular,
  canComment,
  isSensitive,
}: {
  matterId: string;
  organizationId: string;
  currentUserId: string;
  isTitular: boolean;
  canComment: boolean;
  isSensitive: boolean;
}) {
  const supabase = await createClient();
  const [{ data: comments }, sharesResult, collaboratorsResult] = await Promise.all([
    supabase
      .from("matter_comments")
      .select("id, body, created_at, author_id, profiles(full_name, email)")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: true }),
    isTitular
      ? supabase
          .from("matter_shares")
          .select("id, permission, include_documents, expires_at, created_at, profiles!matter_shares_collaborator_id_fkey(full_name, email)")
          .eq("matter_id", matterId)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    isTitular
      ? supabase
          .from("memberships")
          .select("user_id, role, is_active, profiles(full_name, email)")
          .eq("organization_id", organizationId)
      : Promise.resolve({ data: null }),
  ]);

  const shares = sharesResult.data ?? [];
  const members = collaboratorsResult.data ?? [];
  const collaborators = members
    .filter((member) => member.role === "colaborador" && member.is_active)
    .map((member) => ({ id: member.user_id, full_name: member.profiles?.full_name ?? "", email: member.profiles?.email ?? "" }))
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  const titularIds = new Set(members.filter((member) => member.role === "titular").map((member) => member.user_id));

  const authorBadge = (authorId: string) => {
    if (authorId === currentUserId) return <Badge tone="blue">Vos</Badge>;
    if (!isTitular) return null;
    return titularIds.has(authorId) ? <Badge tone="gold">Titular</Badge> : <Badge>Colega</Badge>;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {isTitular ? (
        <Card className="h-fit">
          <CardHeader title="Acceso de colegas" description="Compartí este expediente para pedir una opinión." />
          <div className="space-y-5 p-5">
            {isSensitive ? (
              <p className="flex items-start gap-2 rounded-xl bg-gold-50 px-4 py-3 text-sm text-navy-800">
                <Lock className="mt-0.5 size-4 shrink-0 text-gold-700" aria-hidden="true" />
                Este expediente está marcado como sensible y no puede compartirse.
              </p>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-navy-700">
                Todavía no invitaste colaboradores.{" "}
                <Link href="/panel/colaboradores" className="font-medium text-gold-700 hover:underline">
                  Invitar a un colega
                </Link>
              </p>
            ) : (
              <ShareForm matterId={matterId} collaborators={collaborators} minDate={todayIso()} />
            )}

            {shares.length > 0 ? (
              <ul className="divide-y divide-navy-900/8 rounded-xl border border-navy-900/8" data-testid="shares-list">
                {shares.map((share) => (
                  <li key={share.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-navy-900">
                        {share.profiles?.full_name || share.profiles?.email}
                      </span>
                      <span className="text-navy-700">
                        {sharePermissionLabels[share.permission]}
                        {share.include_documents ? " · con documentos" : ""}
                        {share.expires_at ? ` · hasta ${formatInZone(share.expires_at, "d MMM yyyy")}` : " · sin vencimiento"}
                      </span>
                    </span>
                    <ConfirmActionButton
                      action={revokeShareAction.bind(null, matterId, share.id)}
                      title="¿Quitar el acceso?"
                      description="El colega dejará de ver este expediente inmediatamente."
                      confirmLabel="Quitar acceso"
                      ariaLabel={`Quitar acceso a ${share.profiles?.full_name || share.profiles?.email}`}
                    >
                      <UserX className="size-4.5" aria-hidden="true" />
                    </ConfirmActionButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className={isTitular ? undefined : "lg:col-span-2"}>
        <CardHeader title="Observaciones" description="Intercambio con colegas sobre este expediente." />
        <div className="space-y-5 p-5">
          {comments && comments.length > 0 ? (
            <ul className="space-y-4" data-testid="comments-list">
              {comments.map((comment) => (
                <li key={comment.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-navy-900">{comment.profiles?.full_name || comment.profiles?.email}</span>
                    {authorBadge(comment.author_id)}
                    <span className="text-navy-700">{formatInZone(comment.created_at, "d MMM yyyy · HH:mm")}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-navy-800">{comment.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<MessageSquare aria-hidden="true" />} title="Sin observaciones" />
          )}
          {canComment ? <CommentForm matterId={matterId} /> : (
            <p className="text-sm text-navy-700">Tenés acceso de solo lectura a este expediente.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
