"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

interface SubmitButtonProps {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** Acción alternativa (atributo formAction) para formularios con varios botones. */
  formAction?: (formData: FormData) => void;
}

/** Botón de envío que se deshabilita y muestra progreso mientras corre la Server Action. */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  variant = "primary",
  size = "md",
  className,
  formAction,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      aria-disabled={pending}
      className={buttonClasses(variant, size, className)}
    >
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
