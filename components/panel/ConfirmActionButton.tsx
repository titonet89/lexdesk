"use client";

import { useState, useTransition, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmActionButtonProps {
  /** Server Action ya vinculada a sus argumentos. */
  action: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

/** Botón que pide confirmación en un diálogo accesible antes de una acción destructiva. */
export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel,
  children,
  className,
  ariaLabel,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-muted transition-colors hover:text-danger-ink",
          className,
        )}
        aria-label={ariaLabel}
      >
        {children}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy-950/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-2xl">
          <Dialog.Title className="font-serif text-xl text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-ink-muted">{description}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close className={buttonClasses("ghost", "md")}>Cancelar</Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await action();
                  setOpen(false);
                })
              }
              className={buttonClasses("primary", "md", "bg-red-700 text-white hover:bg-red-800")}
            >
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
