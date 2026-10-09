import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline-light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-[transform,background-color,box-shadow,color,border-color] duration-200 ease-(--ease-out-strong) " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 " +
  "[&_svg]:size-[1.15em] [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  // Texto navy sobre dorado: contraste ~6:1 (blanco sobre dorado no alcanza AA).
  primary:
    "bg-gold-600 text-navy-950 shadow-[0_8px_24px_-8px_rgb(184_137_47/0.6)] hover:bg-gold-500 hover:shadow-[0_12px_28px_-8px_rgb(184_137_47/0.7)]",
  secondary: "bg-ink text-surface hover:bg-ink-soft",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  "outline-light":
    "border border-white/25 bg-white/5 text-white backdrop-blur-sm hover:border-white/50 hover:bg-white/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />;
});

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = "primary", size = "md", className, ...props },
  ref,
) {
  return <a ref={ref} className={buttonClasses(variant, size, className)} {...props} />;
});
