import Link from "next/link";
import { RecoverPasswordForm } from "@/components/auth/RecoverPasswordForm";

export default function RecoverPage() {
  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-ink">Recuperar contraseña</h1>
      <p className="mt-1.5 text-ink-muted">
        Te enviaremos un enlace para crear una contraseña nueva. Por seguridad, después vas a tener que
        confirmar con tu código de verificación.
      </p>
      <RecoverPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/acceso" className="font-medium text-accent-ink underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
