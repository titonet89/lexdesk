import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** Origen de Supabase (API REST/Auth/Storage), permitido para conexiones del navegador. */
function supabaseOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  const { origin, host, protocol } = new URL(url);
  return [origin, `${protocol === "https:" ? "wss" : "ws"}://${host}`];
}

/**
 * Content Security Policy.
 * - Solo scripts propios ('unsafe-inline' lo requiere el arranque de Next sin nonces;
 *   'unsafe-eval' solo en desarrollo).
 * - Conexiones solo al propio sitio y a Supabase.
 * - Iframes permitidos únicamente para el mapa de Google.
 * - Nadie puede embeber este sitio (frame-ancestors 'none').
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigins().join(" ")}`.trim(),
  // blob: permite mostrar la vista previa de PDFs generada en el propio navegador.
  "frame-src 'self' blob: https://maps.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Las áreas privadas nunca se indexan.
        source: "/(panel|acceso|auth)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // El service worker siempre se revisa contra el servidor, así las actualizaciones llegan enseguida.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
