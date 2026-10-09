import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  variant?: "link" | "sidebar";
  className?: string;
}

export function SignOutButton({ variant = "sidebar", className }: SignOutButtonProps) {
  return (
    <form action={async () => {
      "use server";
      await signOutAction();
    }}>
      <button
        type="submit"
        className={cn(
          variant === "link"
            ? "text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            : "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
          className,
        )}
      >
        {variant === "sidebar" ? <LogOut className="size-4.5" aria-hidden="true" /> : null}
        Cerrar sesión
      </button>
    </form>
  );
}
