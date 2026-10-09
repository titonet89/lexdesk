"use client";

import { useActionState } from "react";
import { HandCoins } from "lucide-react";
import { SubmitButton } from "@/components/panel/SubmitButton";
import { Field, FormMessage, Input, Select } from "@/components/panel/ui";
import { initialActionState } from "@/lib/actions";
import { addPaymentAction } from "@/app/panel/honorarios/actions";
import { paymentMethodLabels } from "@/lib/panel/fees";

interface PaymentFormProps {
  matterId: string;
  chargeId: string;
  balance: number;
  today: string;
}

export function PaymentForm({ matterId, chargeId, balance, today }: PaymentFormProps) {
  const [state, formAction] = useActionState(addPaymentAction.bind(null, matterId), initialActionState);
  const balanceText = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balance);

  return (
    <form action={formAction} noValidate className="space-y-3" data-testid="payment-form">
      <input type="hidden" name="charge_id" value={chargeId} />
      <FormMessage message={state.message} tone={state.ok ? "success" : "error"} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Monto cobrado ($)" htmlFor={`pay-amount-${chargeId}`} error={state.fieldErrors.amount}>
          <Input id={`pay-amount-${chargeId}`} name="amount" inputMode="decimal" defaultValue={balanceText} />
        </Field>
        <Field label="Fecha" htmlFor={`pay-date-${chargeId}`}>
          <Input id={`pay-date-${chargeId}`} name="paid_on" type="date" defaultValue={today} />
        </Field>
        <Field label="Medio" htmlFor={`pay-method-${chargeId}`}>
          <Select id={`pay-method-${chargeId}`} name="method" defaultValue="transferencia">
            {(Object.keys(paymentMethodLabels) as (keyof typeof paymentMethodLabels)[]).map((method) => (
              <option key={method} value={method}>
                {paymentMethodLabels[method]}
              </option>
            ))}
          </Select>
        </Field>
        <SubmitButton pendingLabel="Guardando…" size="md">
          <HandCoins aria-hidden="true" />
          Registrar pago
        </SubmitButton>
      </div>
    </form>
  );
}
