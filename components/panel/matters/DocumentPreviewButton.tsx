"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, LoaderCircle, X } from "lucide-react";
import { getDocumentUrlAction } from "@/app/panel/expedientes/actions";
import type { PreviewKind } from "@/lib/panel/documents";

interface Preview {
  url: string;
  text: string | null;
}

/**
 * Vista previa dentro del panel: pide una URL firmada (queda auditada como
 * "consulta"), descarga el archivo como blob y lo muestra sin guardarlo.
 */
export function DocumentPreviewButton({ documentId, name, kind }: { documentId: string; name: string; kind: PreviewKind }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setError(null);
  }

  async function openPreview() {
    setPending(true);
    setError(null);
    setOpen(true);
    const result = await getDocumentUrlAction(documentId, "view");
    if (!result.url) {
      setPending(false);
      setError(result.message ?? "No se pudo abrir el documento.");
      return;
    }
    try {
      const response = await fetch(result.url);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const text = kind === "text" ? await blob.text() : null;
      setPreview({ url: URL.createObjectURL(blob), text });
    } catch {
      setError("No se pudo abrir el documento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => (value ? undefined : close())}>
      <button
        type="button"
        onClick={openPreview}
        className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
        aria-label={`Ver ${name}`}
      >
        <Eye className="size-4.5" aria-hidden="true" />
      </button>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:inset-6 lg:inset-x-[10vw]"
          data-testid="document-preview"
        >
          <div className="flex items-center gap-3 border-b border-ink/8 px-4 py-3">
            <Dialog.Title className="min-w-0 flex-1 truncate font-medium text-ink">{name}</Dialog.Title>
            <Dialog.Description className="sr-only">Vista previa del documento</Dialog.Description>
            <Dialog.Close className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label="Cerrar vista previa">
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="relative flex-1 overflow-auto bg-canvas">
            {pending ? (
              <div className="grid h-full place-items-center">
                <LoaderCircle className="size-7 animate-spin text-accent-ink" aria-label="Cargando documento" />
              </div>
            ) : error ? (
              <p role="alert" className="m-6 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">
                {error}
              </p>
            ) : preview ? (
              kind === "pdf" ? (
                <iframe src={preview.url} title={`Vista previa de ${name}`} className="size-full border-0" data-testid="preview-pdf" />
              ) : kind === "image" ? (
                <div className="grid min-h-full place-items-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob local de vista previa */}
                  <img src={preview.url} alt={name} className="max-h-full max-w-full rounded-lg shadow" data-testid="preview-image" />
                </div>
              ) : (
                <pre className="p-5 text-sm whitespace-pre-wrap text-ink" data-testid="preview-text">
                  {preview.text}
                </pre>
              )
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
