"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "dark", label: "Tema oscuro", icon: Moon },
  { value: "system", label: "Tema del sistema", icon: Monitor },
];

export function persistTheme(theme: Theme) {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <div role="group" aria-label="Tema" className="flex rounded-xl bg-white/5 p-1" data-testid="theme-toggle">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          title={label}
          onClick={() => {
            persistTheme(value);
            onChange(value);
          }}
          className={cn(
            "grid h-8 flex-1 place-items-center rounded-lg transition-colors duration-150",
            theme === value ? "bg-white/15 text-white" : "text-slate-400 hover:text-white",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
