import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getMemberSession } from "@/lib/auth/session";

const notices: Record<string, string> = {
  inactivo: "Tu usuario está desactivado. Consultá con la titular del estudio.",
  "enlace-invalido": "El enlace no es válido o ya venció. Pedí uno nuevo.",
  "sesion-cerrada": "Cerraste sesión correctamente.",
  inactividad: "Cerramos tu sesión por inactividad.",
  "clave-actualizada": "Actualizaste tu contraseña. Ingresá de nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/acceso">) {
  if (await getMemberSession()) redirect("/panel");

  const { estado } = await searchParams;
  const notice = typeof estado === "string" ? notices[estado] : undefined;

  return (
    <>
      <h1 className="font-serif text-3xl tracking-tight text-navy-900">Iniciar sesión</h1>
      <p className="mt-1.5 text-navy-700">Ingresá con tu email y contraseña.</p>
      {notice ? (
        <p role="status" className="mt-5 rounded-xl bg-gold-50 px-4 py-3 text-sm text-navy-800">
          {notice}
        </p>
      ) : null}
      <LoginForm />
    </>
  );
}
