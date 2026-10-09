import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Settings, Wallet } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { buttonClasses } from "@/components/ui/button";
import { requireTitular } from "@/lib/auth/session";
import { formatDateOnly, todayIso } from "@/lib/panel/dates";
import { asChargeStatus, chargeKindLabels, chargeStatusLabels, chargeStatusTones } from "@/lib/panel/fees";
import { formatARS, roundMoney } from "@/lib/panel/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Honorarios" };

export default async function ReceivablesPage({ searchParams }: PageProps<"/panel/honorarios">) {
  const { active: organization } = await requireTitular();
  const { todos } = await searchParams;
  const showAll = todos === "1";
  const monthStart = `${todayIso().slice(0, 7)}-01`;

  const supabase = await createClient();
  const [{ data: charges }, { data: balances }, { data: monthPayments }] = await Promise.all([
    supabase
      .from("matter_charges")
      .select("id, kind, concept, amount, charged_on, due_on, matters!inner(id, title, organization_id, clients(full_name))")
      .eq("matters.organization_id", organization.organizationId)
      .order("charged_on", { ascending: false })
      .limit(500),
    supabase.from("charge_balances").select("charge_id, paid, balance, status"),
    supabase
      .from("charge_payments")
      .select("amount, matter_charges!inner(matters!inner(organization_id))")
      .eq("matter_charges.matters.organization_id", organization.organizationId)
      .gte("paid_on", monthStart),
  ]);

  const balanceById = new Map((balances ?? []).map((row) => [row.charge_id, row]));
  const rows = (charges ?? []).map((charge) => {
    const balance = balanceById.get(charge.id);
    return {
      ...charge,
      status: asChargeStatus(balance?.status ?? null),
      balance: Number(balance?.balance ?? charge.amount),
      paid: Number(balance?.paid ?? 0),
    };
  });
  const open = rows.filter((row) => row.status !== "pagado");
  const visible = showAll ? rows : open;
  const today = todayIso();

  const totalOpen = roundMoney(open.reduce((sum, row) => sum + row.balance, 0));
  const openFees = roundMoney(open.filter((row) => row.kind === "honorario").reduce((sum, row) => sum + row.balance, 0));
  const openExpenses = roundMoney(open.filter((row) => row.kind === "gasto").reduce((sum, row) => sum + row.balance, 0));
  const collectedThisMonth = roundMoney((monthPayments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0));
  const overdue = open.filter((row) => row.due_on && row.due_on < today).length;

  const stats = [
    { label: "Por cobrar", value: totalOpen, tone: "text-danger-ink" },
    { label: "Honorarios pendientes", value: openFees, tone: "text-ink" },
    { label: "Gastos a reintegrar", value: openExpenses, tone: "text-ink" },
    { label: "Cobrado este mes", value: collectedThisMonth, tone: "text-success-ink" },
  ];

  return (
    <>
      <PageHeader
        title="Honorarios"
        description={overdue > 0 ? `Cuentas por cobrar · ${overdue} con fecha de pago vencida` : "Cuentas por cobrar de todos los expedientes."}
        actions={
          <Link href="/panel/ajustes/honorarios" className={buttonClasses("ghost", "md", "border border-ink/15")}>
            <Settings aria-hidden="true" />
            Arancel y UMA
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="receivables-summary">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-ink/8 bg-surface p-5">
            <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{stat.label}</p>
            <p className={cn("mt-1.5 font-serif text-2xl tabular-nums sm:text-3xl", stat.tone)}>{formatARS(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 mb-3 flex justify-end">
        <Link href={showAll ? "/panel/honorarios" : "/panel/honorarios?todos=1"} className="text-sm font-medium text-accent-ink hover:underline">
          {showAll ? "Ver solo pendientes" : "Ver también los pagados"}
        </Link>
      </div>

      <Card>
        {visible.length > 0 ? (
          <ul className="divide-y divide-ink/8" data-testid="receivables-list">
            {visible.map((row) => (
              <li key={row.id}>
                <Link href={`/panel/expedientes/${row.matters.id}?seccion=honorarios`} className="flex items-center gap-4 px-5 py-4 hover:bg-canvas">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{row.concept}</span>
                      <Badge>{chargeKindLabels[row.kind]}</Badge>
                      <Badge tone={chargeStatusTones[row.status]}>{chargeStatusLabels[row.status]}</Badge>
                      {row.due_on && row.due_on < today && row.status !== "pagado" ? <Badge tone="red">Vencido</Badge> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-muted">
                      {[row.matters.title, row.matters.clients?.full_name, formatDateOnly(row.charged_on, "d MMM yyyy")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-serif text-lg text-ink tabular-nums">{formatARS(row.balance)}</span>
                    <span className="block text-xs text-ink-muted tabular-nums">de {formatARS(Number(row.amount))}</span>
                  </span>
                  <ChevronRight className="size-4.5 shrink-0 text-ink-muted/50" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Wallet aria-hidden="true" />}
            title={showAll ? "Todavía no hay honorarios registrados" : "No hay saldos pendientes"}
            description="Los honorarios y gastos se cargan desde la pestaña “Honorarios” de cada expediente."
          />
        )}
      </Card>
    </>
  );
}
