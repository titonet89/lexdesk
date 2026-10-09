import type { Metadata } from "next";
import { IdleLogout } from "@/components/panel/IdleLogout";
import { PanelShell } from "@/components/panel/PanelShell";
import { requireMember } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const { profile } = await requireMember();

  return (
    <PanelShell role={profile.role} displayName={profile.full_name || profile.email}>
      {children}
      <IdleLogout />
    </PanelShell>
  );
}
