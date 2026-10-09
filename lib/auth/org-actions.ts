"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_ORG_COOKIE, getMemberSession } from "@/lib/auth/session";
import { uuidSchema } from "@/lib/panel/schemas";

/** Cambia el estudio activo (solo entre los estudios de los que la persona es miembro). */
export async function switchOrganizationAction(organizationId: string): Promise<void> {
  const session = await getMemberSession();
  if (!session || !uuidSchema.safeParse(organizationId).success) return;
  if (!session.memberships.some((membership) => membership.organizationId === organizationId)) return;

  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  redirect("/panel");
}
