"use server";

import { redirect } from "next/navigation";
import { totp } from "@/lib/auth/totp";
import { isDemo } from "@/lib/demo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Clave del secreto TOTP de la cuenta demo en `app_metadata` (solo la escribe el servidor). */
const SECRET_KEY = "demo_totp_secret";

/**
 * "Entrar a la demo": inicia sesión como la cuenta de demostración, con
 * contraseña y código, todo del lado del servidor. La verificación en dos pasos
 * sigue vigente (la base de datos la exige igual); simplemente la completa el
 * servidor, que conoce el secreto de esa cuenta ficticia.
 *
 * Como la cuenta es compartida, cada ingreso repara lo que un visitante haya
 * podido cambiar: restablece la contraseña y, si el 2FA ya no coincide, lo
 * vuelve a configurar.
 */
export async function enterDemoAction(): Promise<void> {
  if (!isDemo) throw new Error("La demo no está habilitada en este entorno.");
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;
  if (!email || !password) throw new Error("Faltan DEMO_USER_EMAIL o DEMO_USER_PASSWORD.");

  const admin = createAdminClient();
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((candidate) => candidate.email === email);
  if (!user) throw new Error("No existe la cuenta demo: cargá los datos con el seed.");

  const supabase = await createClient();
  let { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Alguien cambió la contraseña. Se restablece solo en ese caso, porque
    // cambiarla cierra las sesiones de las demás personas que están en la demo.
    await admin.auth.admin.updateUserById(user.id, { password });
    ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }));
  }
  if (signInError) throw new Error(`No se pudo ingresar a la demo: ${signInError.message}`);

  // Camino habitual: el factor TOTP existe y el secreto guardado coincide.
  const storedSecret = user.app_metadata?.[SECRET_KEY] as string | undefined;
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((item) => item.status === "verified");
  if (factor && storedSecret) {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: totp(storedSecret) });
    if (!error) redirect("/panel");
  }

  // Reparación: se descartan los factores y se configura uno nuevo con secreto conocido.
  const { data: adminFactors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
  for (const item of adminFactors?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: item.id });
  }
  const { data: enrollment, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Demo ${Date.now()}`,
  });
  if (enrollError || !enrollment) throw new Error(`No se pudo preparar la demo: ${enrollError?.message}`);
  const secret = enrollment.totp.secret;
  await admin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, [SECRET_KEY]: secret } });

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code: totp(secret) });
  if (verifyError) throw new Error(`No se pudo preparar la demo: ${verifyError.message}`);
  redirect("/panel");
}
