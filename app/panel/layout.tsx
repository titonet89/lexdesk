import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { IdleLogout } from "@/components/panel/IdleLogout";
import { PanelShell } from "@/components/panel/PanelShell";
import { requireMember } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · LexDesk" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { profile, active, memberships } = await requireMember();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <PanelShell
      initialTheme={theme}
      role={active.role}
      displayName={profile.full_name || profile.email}
      activeOrganization={{ id: active.organizationId, name: active.organizationName }}
      organizations={memberships.map((membership) => ({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
      }))}
    >
      {children}
      <IdleLogout />
    </PanelShell>
  );
}
