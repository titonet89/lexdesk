import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export const fieldBase =
  "w-full rounded-xl border border-navy-900/15 bg-white px-3.5 text-[15px] text-navy-900 placeholder:text-navy-700/45 " +
  "transition-[border-color,box-shadow] duration-150 outline-none " +
  "focus:border-gold-600 focus:ring-4 focus:ring-gold-600/15 " +
  "aria-[invalid=true]:border-red-600 disabled:bg-slate-50 disabled:text-navy-700";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-11 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
        {required ? (
          <span className="ml-0.5 text-gold-700" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-sm text-navy-700/70">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-navy-900/8 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, description }: { title: string; action?: ReactNode; description?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-navy-900/8 px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-serif text-lg leading-tight text-navy-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-navy-700">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2 text-sm text-navy-700">{eyebrow}</div> : null}
        <h1 className="font-serif text-3xl leading-tight tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1.5 text-navy-700">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export type BadgeTone = "neutral" | "gold" | "green" | "red" | "blue" | "amber";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-navy-900/6 text-navy-800",
  gold: "bg-gold-50 text-gold-700 ring-1 ring-gold-600/20",
  green: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/15",
  red: "bg-red-50 text-red-800 ring-1 ring-red-600/15",
  blue: "bg-sky-50 text-sky-800 ring-1 ring-sky-600/15",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
};

export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-gold-50 text-gold-700 [&_svg]:size-6">{icon}</span>
      <p className="mt-4 font-serif text-xl text-navy-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-navy-700">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function FormMessage({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        tone === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800",
      )}
    >
      {message}
    </p>
  );
}
