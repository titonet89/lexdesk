"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Textarea } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { addCommentAction } from "@/app/panel/expedientes/actions";

export function CommentForm({ matterId }: { matterId: string }) {
  const [state, formAction] = useActionState(addCommentAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-3" data-testid="comment-form">
      <input type="hidden" name="matter_id" value={matterId} />
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <Field label="Observación" htmlFor="comment-body" error={state.fieldErrors.body}>
        <Textarea id="comment-body" name="body" rows={3} placeholder="Escribí tu opinión o sugerencia sobre el expediente…" />
      </Field>
      <p className="text-xs text-navy-700/70">Los comentarios quedan registrados y no se pueden editar ni borrar.</p>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Publicando…">
          <MessageSquare aria-hidden="true" />
          Publicar observación
        </SubmitButton>
      </div>
    </form>
  );
}
