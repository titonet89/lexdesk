"use client";

import { Input } from "@/components/panel/ui";

interface TotpCodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}

/** Campo para el código TOTP de 6 dígitos (teclado numérico y autocompletado de iOS/Android). */
export function TotpCodeInput({ id, value, onChange, invalid, autoFocus }: TotpCodeInputProps) {
  return (
    <Input
      id={id}
      name="code"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      placeholder="000000"
      aria-invalid={invalid ? true : undefined}
      autoFocus={autoFocus}
      className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
    />
  );
}
