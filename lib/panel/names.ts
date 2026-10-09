/** Primer nombre para saludos, sin títulos como "Dra." o "Lic.". */
export function firstName(fullName: string): string {
  const withoutTitle = fullName.replace(/^(dra?|lic|abog|esc|ing|sr|sra)\.?\s+/i, "").trim();
  return withoutTitle.split(/\s+/)[0] || fullName;
}
