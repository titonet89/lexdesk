import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { PwaSetup } from "@/components/PwaSetup";
import {
  isProductionDeployment,
  officesLabel,
  practiceAreasLabel,
  primaryOffice,
  siteConfig,
} from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

const title = `${siteConfig.lawyer.name} | ${siteConfig.lawyer.title} en ${officesLabel}`;
const description = `${siteConfig.lawyer.title} en ${officesLabel}: ${practiceAreasLabel}. Consultas presenciales${
  siteConfig.offersOnlineConsultations ? " y en línea" : ""
} por WhatsApp.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: title,
    template: `%s | ${siteConfig.lawyer.shortName}`,
  },
  description,
  applicationName: siteConfig.lawyer.shortName,
  keywords: [
    ...new Set(siteConfig.offices.flatMap((office) => [`abogada ${office.locality}`, `abogada ${office.region}`])),
    ...siteConfig.practiceAreas.map((area) => `${area.title.toLowerCase()} ${primaryOffice.region}`),
  ],
  authors: [{ name: siteConfig.lawyer.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.lawyer.shortName,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: isProductionDeployment,
    follow: isProductionDeployment,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iPhone/iPad: "Agregar a inicio" abre el panel a pantalla completa.
  appleWebApp: { capable: true, title: "LexDesk", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#contenido"
          className="sr-only rounded-full bg-gold-600 px-4 py-2 font-semibold text-navy-950 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
        >
          Saltar al contenido
        </a>
        <MotionProvider>{children}</MotionProvider>
        <PwaSetup />
      </body>
    </html>
  );
}
