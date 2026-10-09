import { Receipt, Trash, Wallet } from "lucide-react";
import { ChargeForm } from "@/components/panel/fees/ChargeForm";
import { PaymentForm } from "@/components/panel/fees/PaymentForm";
import { ConfirmActionButton } from "@/components/panel/ConfirmActionButton";
import { Badge, Card, CardHeader, EmptyState } from "@/components/panel/ui";
import { deleteChargeAction, deletePaymentAction } from "@/app/panel/honorarios/actions";
import { formatDateOnly, todayIso } from "@/lib/panel/dates";
import {
  asChargeStatus,
  chargeKindLabels,
  chargeStatusLabels,
  chargeStatusTones,
  paymentMethodLabels,
} from "@/lib/panel/fees";
import { getCurrentUma, getScheduleOptions } from "@/lib/panel/fees-data";
import { formatARS, formatUma, roundMoney } from "@/lib/panel/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function Summary({ label, value, tone }: { label: string; value: number; tone?: "accent" | "danger" | "success" }) {
  return (
    <div className="rounded-2xl border border-ink/8 bg-surface p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
      <p
        className={cn(
          "mt-1 font-serif text-2xl text-ink tabular-nums",
          tone === "danger" && "text-danger-ink",
          tone === "success" && "text-success-ink",
          tone === "accent" && "text-accent-ink",
        )}
      >
        {formatARS(value)}
      </p>
    </div>
  );
}

export async function FeesSection({ matterId, organizationId }: { matterId: string; organizationId: string }) {
  const supabase = await createClient();
  const [{ data: charges }, { data: balances }, { data: payments }, uma, options] = await Promise.all([
    supabase.from("matter_charges").select("*").eq("matter_id", matterId).order("charged_on", { ascending: false }),
    supabase.from("charge_balances").select("charge_id, paid, balance, status").eq("matter_id", matterId),
    supabase
      .from("charge_payments")
      .select("id, charge_id, amount, paid_on, method, matter_charges!inner(matter_id)")
      .eq("matter_charges.matter_id", matterId)
      .order("paid_on", { ascending: false }),
    getCurrentUma(organizationId),
    getScheduleOptions(organizationId),
  ]);

  const balanceById = new Map((balances ?? []).map((row) => [row.charge_id, row]));
  const totals = (charges ?? []).reduce(
    (acc, charge) => {
      const amount = Number(charge.amount);
      const paid = Number(balanceById.get(charge.id)?.paid ?? 0);
      if (charge.kind === "honorario") acc.fees += amount;
      else acc.expenses += amount;
      acc.paid += paid;
      return acc;
    },
    { fees: 0, expenses: 0, paid: 0 },
  );
  const pending = roundMoney(totals.fees + totals.expenses - totals.paid);
  const today = todayIso();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="fees-summary">
        <Summary label="Honorarios" value={totals.fees} />
        <Summary label="Gastos" value={totals.expenses} />
        <Summary label="Cobrado" value={totals.paid} tone="success" />
        <Summary label="Saldo pendiente" value={pending} tone={pending > 0 ? "danger" : undefined} />
      </div>

      <Card>
        <CardHeader
          title="Registrar honorario o gasto"
          description={
            uma
              ? `Arancel de referencia del estudio · UMA vigente ${formatARS(uma.value)} desde ${formatDateOnly(uma.effectiveFrom, "d MMM yyyy")}`
              : "Cargá el valor de la UMA en Ajustes → Honorarios para calcular desde el arancel."
          }
        />
        <div className="p-5">
          <ChargeForm matterId={matterId} today={today} uma={uma} options={options} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Cuenta del expediente" description={`${charges?.length ?? 0} cargos`} />
        {charges && charges.length > 0 ? (
          <ul className="divide-y divide-ink/8" data-testid="charges-list">
            {charges.map((charge) => {
              const balance = balanceById.get(charge.id);
              const status = asChargeStatus(balance?.status ?? null);
              const paid = Number(balance?.paid ?? 0);
              const amount = Number(charge.amount);
              const chargePayments = (payments ?? []).filter((payment) => payment.charge_id === charge.id);
              return (
                <li key={charge.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-ink">
                      {charge.kind === "honorario" ? <Wallet className="size-4.5" aria-hidden="true" /> : <Receipt className="size-4.5" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{charge.concept}</span>
                        <Badge>{chargeKindLabels[charge.kind]}</Badge>
                        <Badge tone={chargeStatusTones[status]}>{chargeStatusLabels[status]}</Badge>
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {formatDateOnly(charge.charged_on, "d MMM yyyy")}
                        {charge.uma_quantity && charge.uma_value
                          ? ` · ${formatUma(Number(charge.uma_quantity))} × ${formatARS(Number(charge.uma_value))}`
                          : ""}
                        {charge.due_on ? ` · vence ${formatDateOnly(charge.due_on, "d MMM yyyy")}` : ""}
                      </p>
                      <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink/8" aria-hidden="true">
                        <div className="h-full rounded-full bg-success-ink/70" style={{ width: `${Math.min(100, (paid / amount) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-xl text-ink tabular-nums">{formatARS(amount)}</p>
                      <p className="text-xs text-ink-muted tabular-nums">
                        Cobrado {formatARS(paid)} · Saldo {formatARS(Number(balance?.balance ?? amount))}
                      </p>
                    </div>
                    <ConfirmActionButton
                      action={deleteChargeAction.bind(null, matterId, charge.id)}
                      title="¿Eliminar este cargo?"
                      description="También se eliminan sus pagos. Queda registrado en la auditoría."
                      confirmLabel="Eliminar"
                      className="grid size-9 place-items-center"
                      ariaLabel={`Eliminar ${charge.concept}`}
                    >
                      <Trash className="size-4" aria-hidden="true" />
                    </ConfirmActionButton>
                  </div>

                  {chargePayments.length > 0 ? (
                    <ul className="mt-3 space-y-1 pl-12 text-sm">
                      {chargePayments.map((payment) => (
                        <li key={payment.id} className="flex items-center gap-2 text-ink-soft">
                          <span className="tabular-nums">{formatDateOnly(payment.paid_on, "d MMM yyyy")}</span>
                          <span>· {paymentMethodLabels[payment.method]}</span>
                          <span className="ml-auto font-medium text-success-ink tabular-nums">{formatARS(Number(payment.amount))}</span>
                          <ConfirmActionButton
                            action={deletePaymentAction.bind(null, matterId, payment.id)}
                            title="¿Anular este pago?"
                            description="El saldo del cargo vuelve a aumentar."
                            confirmLabel="Anular"
                            ariaLabel="Anular pago"
                          >
                            <Trash className="size-3.5" aria-hidden="true" />
                          </ConfirmActionButton>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {status !== "pagado" ? (
                    <details className="mt-3 pl-12">
                      <summary className="cursor-pointer text-sm font-medium text-accent-ink hover:underline">Registrar pago</summary>
                      <div className="mt-3">
                        <PaymentForm matterId={matterId} chargeId={charge.id} balance={Number(balance?.balance ?? amount)} today={today} />
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={<Wallet aria-hidden="true" />} title="Sin honorarios ni gastos" description="Registrá el honorario pactado o calculado y los gastos del expediente." />
        )}
      </Card>
    </div>
  );
}
