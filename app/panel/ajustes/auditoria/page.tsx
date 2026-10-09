import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileClock } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, Select } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatInZone } from "@/lib/panel/dates";
import { auditActionLabels, auditTableLabels } from "@/lib/panel/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Auditoría" };

const actionTones: Record<string, "green" | "blue" | "red" | "gold" | "neutral"> = {
  insert: "green",
  update: "blue",
  delete: "red",
  view: "neutral",
  download: "gold",
};

export default async function AuditPage({ searchParams }: PageProps<"/panel/ajustes/auditoria">) {
  const { active: organization } = await requireTitular();
  const { tabla } = await searchParams;
  const table = typeof tabla === "string" && tabla in auditTableLabels ? tabla : undefined;

  const supabase = await createClient();
  let request = supabase
    .from("audit_log")
    .select("id, occurred_at, actor_id, action, table_name, record_id, changed_columns")
    .eq("organization_id", organization.organizationId)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (table) request = request.eq("table_name", table);

  const [{ data: rows }, { data: profiles }] = await Promise.all([
    request,
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || profile.email]));

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Últimos 200 movimientos. Por privacidad se registran los campos modificados, no su contenido."
        eyebrow={
          <Link href="/panel/ajustes" className="inline-flex items-center gap-1 hover:text-navy-900">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ajustes
          </Link>
        }
      />

      <form className="mb-4 flex gap-2">
        <Select name="tabla" defaultValue={table ?? ""} aria-label="Filtrar por tipo de registro" className="max-w-xs">
          <option value="">Todos los registros</option>
          {Object.entries(auditTableLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Filtrar
        </button>
      </form>

      <Card>
        {rows && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm" data-testid="audit-table">
              <thead className="border-b border-navy-900/8 bg-slate-50 text-xs font-semibold tracking-wide text-navy-700 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">Fecha</th>
                  <th scope="col" className="px-5 py-3">Usuario</th>
                  <th scope="col" className="px-5 py-3">Acción</th>
                  <th scope="col" className="px-5 py-3">Registro</th>
                  <th scope="col" className="px-5 py-3">Campos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/8">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-navy-800 tabular-nums">
                      {formatInZone(row.occurred_at, "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-3 text-navy-900">{row.actor_id ? (names.get(row.actor_id) ?? "Usuario eliminado") : "Sistema"}</td>
                    <td className="px-5 py-3">
                      <Badge tone={actionTones[row.action] ?? "neutral"}>{auditActionLabels[row.action] ?? row.action}</Badge>
                    </td>
                    <td className="px-5 py-3 text-navy-800">{auditTableLabels[row.table_name] ?? row.table_name}</td>
                    <td className="px-5 py-3 text-xs text-navy-700">{row.changed_columns?.join(", ") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<FileClock aria-hidden="true" />} title="Sin movimientos" />
        )}
      </Card>
    </>
  );
}
