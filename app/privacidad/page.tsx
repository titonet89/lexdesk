import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${siteConfig.lawyer.name} trata los datos personales recibidos a través de este sitio.`,
  alternates: { canonical: "/privacidad" },
};

/** Fecha de la última revisión del texto legal. Actualizar ante cada cambio. */
const LAST_UPDATED = "8 de octubre de 2026";

export default function PrivacyPage() {
  const { lawyer, email, phoneDisplay } = siteConfig;

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-lg">{lawyer.shortName}</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Política de privacidad</h1>
        <p className="mt-3 text-sm text-navy-700">Última actualización: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-8 leading-relaxed text-navy-800 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-navy-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <section className="space-y-3">
            <h2>1. Responsable</h2>
            <p>
              El responsable del tratamiento de los datos es {lawyer.name}, abogada, matrícula {lawyer.registration}.
              Contacto: {email ? `${email} · ` : ""}
              {phoneDisplay}.
            </p>
          </section>

          <section className="space-y-3">
            <h2>2. Qué datos recibimos</h2>
            <p>A través del formulario de consulta podés enviarnos:</p>
            <ul>
              <li>Nombre y apellido.</li>
              <li>Número de WhatsApp.</li>
              <li>Área de consulta y una breve descripción de tu caso.</li>
            </ul>
            <p>
              Te pedimos no incluir en el primer mensaje información de salud u otros datos sensibles: los
              abordaremos de forma reservada si la consulta avanza.
            </p>
          </section>

          <section className="space-y-3">
            <h2>3. Cómo se procesan</h2>
            <p>
              El formulario no guarda tus datos en este sitio: arma un mensaje que se abre en tu propia aplicación
              de WhatsApp, y vos decidís si enviarlo. Una vez enviado, la conversación queda sujeta a las
              condiciones de WhatsApp (Meta Platforms, Inc.).
            </p>
          </section>

          <section className="space-y-3">
            <h2>4. Para qué los usamos</h2>
            <p>
              Exclusivamente para responder tu consulta y, si nos contratás, para la gestión de tu caso. No
              vendemos, cedemos ni compartimos tus datos con terceros con fines comerciales. Toda la información
              está amparada por el secreto profesional.
            </p>
          </section>

          <section className="space-y-3">
            <h2>5. Cuánto tiempo los conservamos</h2>
            <p>
              Mientras sea necesario para atender tu consulta o durante los plazos que exijan las normas
              profesionales y legales aplicables. Luego se eliminan de forma segura.
            </p>
          </section>

          <section className="space-y-3">
            <h2>6. Tus derechos</h2>
            <p>
              Podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos
              escribiendo a los contactos indicados en el punto 1.
            </p>
            <p>
              El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en
              forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al
              efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326.
            </p>
            <p>
              La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N°
              25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten
              afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos
              personales.
            </p>
          </section>

          <section className="space-y-3">
            <h2>7. Seguridad</h2>
            <p>
              Este sitio se sirve exclusivamente por conexión cifrada (HTTPS) y aplica medidas técnicas y
              organizativas razonables para proteger la información.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
