"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Upload } from "lucide-react";
import { FormMessage } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { registerDocumentAction } from "@/app/panel/expedientes/actions";
import {
  DOCUMENT_ACCEPT,
  formatBytes,
  isAllowedDocumentType,
  MAX_DOCUMENT_BYTES,
  safeStorageName,
} from "@/lib/panel/documents";
import { createClient } from "@/lib/supabase/client";

/**
 * Sube el archivo directo del navegador al bucket privado (la política de
 * Storage exige titular con 2FA) y después lo registra en el servidor.
 */
export function DocumentUploader({ matterId }: { matterId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setStatus(null);
    const supabase = createClient();
    let uploaded = 0;

    for (const file of files) {
      if (!isAllowedDocumentType(file.type)) {
        setStatus({ tone: "error", message: `“${file.name}”: tipo de archivo no permitido.` });
        continue;
      }
      if (file.size > MAX_DOCUMENT_BYTES) {
        setStatus({ tone: "error", message: `“${file.name}” supera el máximo de ${formatBytes(MAX_DOCUMENT_BYTES)}.` });
        continue;
      }

      setUploading(file.name);
      const documentId = crypto.randomUUID();
      const storagePath = `${matterId}/${documentId}/${safeStorageName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("expedientes")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setStatus({ tone: "error", message: `No se pudo subir “${file.name}”.` });
        continue;
      }

      const result = await registerDocumentAction({
        matterId,
        documentId,
        name: file.name.slice(0, 200),
        storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!result.ok) {
        setStatus({ tone: "error", message: result.message });
        continue;
      }
      uploaded += 1;
    }

    setUploading(null);
    if (uploaded > 0) {
      setStatus({ tone: "success", message: uploaded === 1 ? "Documento subido." : `${uploaded} documentos subidos.` });
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <FormMessage message={status?.message} tone={status?.tone} />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT}
        onChange={handleFiles}
        className="sr-only"
        id={`upload-${matterId}`}
        data-testid="document-input"
      />
      <label
        htmlFor={`upload-${matterId}`}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy-900/15 px-6 py-8 text-center transition-colors hover:border-gold-600/50 hover:bg-gold-50/40"
      >
        {uploading ? (
          <>
            <LoaderCircle className="size-6 animate-spin text-gold-700" aria-hidden="true" />
            <span className="text-sm text-navy-800">Subiendo “{uploading}”…</span>
          </>
        ) : (
          <>
            <Upload className="size-6 text-gold-700" aria-hidden="true" />
            <span className={buttonClasses("secondary", "sm", "pointer-events-none")}>Elegir archivos</span>
            <span className="text-xs text-navy-700">PDF, imágenes, Word, Excel o texto · hasta 25 MB</span>
          </>
        )}
      </label>
    </div>
  );
}
