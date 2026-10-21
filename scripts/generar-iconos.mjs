/**
 * Genera los íconos de la app instalable (PWA) a partir de un SVG:
 *   node scripts/generar-iconos.mjs
 *
 * - icon-*.png: ícono normal (fondo navy con esquinas redondeadas propias del sistema).
 * - maskable-*.png: para Android, con el símbolo dentro de la zona segura (80 %),
 *   porque el sistema lo recorta en círculo, gota o cuadrado.
 * - apple-touch-icon.png: pantalla de inicio de iPhone/iPad.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const NAVY = "#0f172a";
const GOLD = "#dcb877";
const RING = "#b8892f";

// Balanza de lucide (24×24), centrada.
const scale = `
  <path d="M12 3v18"/>
  <path d="m19 8 3 8a5 5 0 0 1-6 0zV7"/>
  <path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1"/>
  <path d="m5 8 3 8a5 5 0 0 1-6 0zV7"/>
  <path d="M7 21h10"/>`;

/** `symbol`: fracción del lienzo que ocupa el círculo dorado. */
function svg(symbol) {
  const r = 256 * symbol;
  const glyph = r * 1.2; // lado del dibujo de la balanza
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${NAVY}"/>
  <circle cx="256" cy="256" r="${r - 6}" fill="none" stroke="${RING}" stroke-opacity="0.75" stroke-width="10"/>
  <g transform="translate(${256 - glyph / 2} ${256 - glyph / 2}) scale(${glyph / 24})"
     fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${scale}</g>
</svg>`;
}

const variants = [
  { file: "icon-192.png", size: 192, symbol: 0.78 },
  { file: "icon-512.png", size: 512, symbol: 0.78 },
  { file: "maskable-192.png", size: 192, symbol: 0.6 },
  { file: "maskable-512.png", size: 512, symbol: 0.6 },
  { file: "apple-touch-icon.png", size: 180, symbol: 0.7 },
];

writeFileSync("public/icons/icon.svg", svg(0.78));

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, symbol } of variants) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(symbol)}`,
  );
  await page.screenshot({ path: `public/icons/${file}`, omitBackground: false });
  console.log("ok", file);
}
await browser.close();
