"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { getDocumentUrlAction } from "@/app/panel/expedientes/actions";

/** Pide al servidor una URL firmada de corta duración (queda registrada en la auditoría). */
export function DocumentDownloadButton({ documentId, name }: { documentId: string; name: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await getDocumentUrlAction(documentId);
    if (!result.url) {
      setPending(false);
      setError(result.message ?? "No se pudo descargar.");
      return;
    }
    try {
      // Se descarga como blob para conservar el nombre original (con tildes) del archivo.
      const response = await fetch(result.url);
      if (!response.ok) throw new Error(String(response.status));
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    } catch {
      setError("No se pudo descargar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="grid size-9 place-items-center rounded-lg text-navy-700 transition-colors hover:bg-navy-900/5 hover:text-navy-900"
        aria-label={`Descargar ${name}`}
      >
        {pending ? <LoaderCircle className="size-4.5 animate-spin" aria-hidden="true" /> : <Download className="size-4.5" aria-hidden="true" />}
      </button>
    </span>
  );
}
