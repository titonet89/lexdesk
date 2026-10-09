"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  actionError,
  actionSuccess,
  formText,
  GENERIC_ERROR,
  zodFieldErrors,
  type ActionState,
} from "@/lib/actions";
import { getMemberSession, getTitularOrNull } from "@/lib/auth/session";
import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@/lib/panel/documents";
import { zonedInputToIso } from "@/lib/panel/dates";
import { commentSchema, entrySchema, matterSchema, shareSchema, uuidSchema } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

function matterPath(id: string) {
  return `/panel/expedientes/${id}`;
}

function parseMatter(formData: FormData) {
  return matterSchema.safeParse({
    client_id: formText(formData, "client_id"),
    title: formText(formData, "title"),
    file_number: formText(formData, "file_number"),
    area: formText(formData, "area"),
    court: formText(formData, "court"),
    jurisdiction: formText(formData, "jurisdiction"),
    counterpart: formText(formData, "counterpart"),
    status: formText(formData, "status"),
    opened_on: formText(formData, "opened_on"),
    closed_on: formText(formData, "closed_on"),
    description: formText(formData, "description"),
    is_sensitive: formData.get("is_sensitive") === "on",
  });
}

function duplicateFileNumber(code: string | undefined) {
  return code === "23505"
    ? actionError("Ya existe un expediente con ese número.", { file_number: "Número de expediente duplicado." })
    : null;
}

// ---------------------------------------------------------------------------
// Expedientes
// ---------------------------------------------------------------------------

export async function createMatterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = parseMatter(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.from("matters").insert(parsed.data).select("id").single();
  if (error || !data) return duplicateFileNumber(error?.code) ?? actionError(GENERIC_ERROR);

  revalidatePath("/panel/expedientes");
  redirect(matterPath(data.id));
}

export async function updateMatterAction(matterId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  if (!uuidSchema.safeParse(matterId).success) return actionError("Expediente inválido.");
  const parsed = parseMatter(formData);
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("matters").update(parsed.data).eq("id", matterId);
  if (error) return duplicateFileNumber(error.code) ?? actionError(GENERIC_ERROR);

  revalidatePath("/panel/expedientes");
  revalidatePath(matterPath(matterId));
  redirect(matterPath(matterId));
}

// ---------------------------------------------------------------------------
// Actuaciones
// ---------------------------------------------------------------------------

export async function addEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = entrySchema.safeParse({
    matter_id: formText(formData, "matter_id"),
    occurred_on: formText(formData, "occurred_on"),
    kind: formText(formData, "kind"),
    summary: formText(formData, "summary"),
    details: formText(formData, "details"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.from("matter_entries").insert(parsed.data);
  if (error) return actionError(GENERIC_ERROR);

  revalidatePath(matterPath(parsed.data.matter_id));
  revalidatePath("/panel");
  return actionSuccess("Actuación registrada.");
}

export async function deleteEntryAction(matterId: string, entryId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(matterId).success || !uuidSchema.safeParse(entryId).success) return;
  const supabase = await createClient();
  await supabase.from("matter_entries").delete().eq("id", entryId).eq("matter_id", matterId);
  revalidatePath(matterPath(matterId));
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

const registerDocumentSchema = z.object({
  matterId: uuidSchema,
  documentId: uuidSchema,
  name: z.string().trim().min(1).max(200),
  storagePath: z.string().max(400),
  mimeType: z.enum(ALLOWED_DOCUMENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
});

/**
 * Registra un documento ya subido a Storage desde el navegador. Valida que la
 * ruta corresponda al expediente y que el archivo exista realmente.
 */
export async function registerDocumentAction(
  input: z.input<typeof registerDocumentSchema>,
): Promise<{ ok: boolean; message: string }> {
  if (!(await getTitularOrNull())) return { ok: false, message: "No autorizado." };
  const parsed = registerDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Archivo inválido." };
  const { matterId, documentId, name, storagePath, mimeType, sizeBytes } = parsed.data;

  if (!storagePath.startsWith(`${matterId}/${documentId}/`) || storagePath.includes("..")) {
    return { ok: false, message: "Ruta de archivo inválida." };
  }

  const supabase = await createClient();
  const folder = `${matterId}/${documentId}`;
  const { data: objects } = await supabase.storage.from("expedientes").list(folder);
  const fileName = storagePath.slice(folder.length + 1);
  if (!objects?.some((object) => object.name === fileName)) {
    return { ok: false, message: "No encontramos el archivo subido." };
  }

  const { error } = await supabase.from("documents").insert({
    id: documentId,
    matter_id: matterId,
    name,
    storage_path: storagePath,
    mime_type: mimeType,
    size_bytes: sizeBytes,
  });
  if (error) {
    await supabase.storage.from("expedientes").remove([storagePath]);
    return { ok: false, message: GENERIC_ERROR };
  }

  revalidatePath(matterPath(matterId));
  return { ok: true, message: "Documento subido." };
}

/** Genera una URL firmada de 60 s para descargar un documento y registra el acceso. */
export async function getDocumentUrlAction(documentId: string): Promise<{ url: string | null; message?: string }> {
  if (!(await getMemberSession())) return { url: null, message: "No autorizado." };
  if (!uuidSchema.safeParse(documentId).success) return { url: null, message: "Documento inválido." };

  const supabase = await createClient();
  // La consulta pasa por RLS: si no tiene acceso, no obtiene la fila.
  const { data: document } = await supabase
    .from("documents")
    .select("id, name, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return { url: null, message: "No tenés acceso a este documento." };

  const { data, error } = await supabase.storage
    .from("expedientes")
    .createSignedUrl(document.storage_path, 60);
  if (error || !data) return { url: null, message: GENERIC_ERROR };

  await supabase.rpc("log_access", { p_table_name: "documents", p_record_id: document.id, p_action: "download" });
  return { url: data.signedUrl };
}

export async function deleteDocumentAction(matterId: string, documentId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(matterId).success || !uuidSchema.safeParse(documentId).success) return;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("matter_id", matterId)
    .maybeSingle();
  if (!document) return;

  await supabase.storage.from("expedientes").remove([document.storage_path]);
  await supabase.from("documents").delete().eq("id", documentId);
  revalidatePath(matterPath(matterId));
}

// ---------------------------------------------------------------------------
// Colaboración
// ---------------------------------------------------------------------------

export async function createShareAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getTitularOrNull())) return actionError("No autorizado.");
  const parsed = shareSchema.safeParse({
    matter_id: formText(formData, "matter_id"),
    collaborator_id: formText(formData, "collaborator_id"),
    permission: formText(formData, "permission"),
    include_documents: formData.get("include_documents") === "on",
    expires_on: formText(formData, "expires_on"),
  });
  if (!parsed.success) return actionError("Revisá los datos marcados.", zodFieldErrors(parsed.error));

  const { expires_on: expiresOn, ...share } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("matter_shares").insert({
    ...share,
    expires_at: expiresOn ? zonedInputToIso(expiresOn, "23:59") : null,
  });
  if (error) {
    if (error.code === "23505") return actionError("Ese colaborador ya tiene acceso a este expediente.");
    if (error.message.includes("sensible")) return actionError("Este expediente es sensible y no puede compartirse.");
    return actionError(GENERIC_ERROR);
  }

  revalidatePath(matterPath(share.matter_id));
  return actionSuccess("Acceso compartido.");
}

export async function revokeShareAction(matterId: string, shareId: string): Promise<void> {
  if (!(await getTitularOrNull())) return;
  if (!uuidSchema.safeParse(matterId).success || !uuidSchema.safeParse(shareId).success) return;
  const supabase = await createClient();
  await supabase
    .from("matter_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId)
    .eq("matter_id", matterId);
  revalidatePath(matterPath(matterId));
}

export async function addCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await getMemberSession())) return actionError("No autorizado.");
  const parsed = commentSchema.safeParse({
    matter_id: formText(formData, "matter_id"),
    body: formText(formData, "body"),
  });
  if (!parsed.success) return actionError("Revisá el comentario.", zodFieldErrors(parsed.error));

  const supabase = await createClient();
  // RLS verifica que tenga permiso de comentario sobre este expediente.
  const { error } = await supabase.from("matter_comments").insert(parsed.data);
  if (error) {
    return actionError(error.code === "42501" ? "No tenés permiso para comentar este expediente." : GENERIC_ERROR);
  }

  revalidatePath(matterPath(parsed.data.matter_id));
  return actionSuccess("Comentario publicado.");
}
