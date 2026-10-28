/* Client billing labels and the installment preview (shared by server and client). */

import type { ClientBilling } from "@/types/work/domain";

export const BILLING_MODEL: Record<ClientBilling["model"], string> = {
  project: "Por proyecto",
  retainer: "Fee mensual (retainer)",
  hourly: "Por horas",
};
export const PAYMENT_METHOD: Record<ClientBilling["paymentMethod"], string> = {
  transfer: "Transferencia bancaria",
  pse: "PSE",
  card: "Tarjeta de crédito",
  check: "Cheque",
  cash: "Efectivo",
  other: "Otro",
};
export const TERMS = [0, 15, 30, 45, 60, 90];
export const termsLabel = (d: number) => (d === 0 ? "De contado" : `${d} días`);

/** A retainer bills its fee every month; other models split one contract value. */
export const contractTotal = (b: Pick<ClientBilling, "model" | "contractValue" | "installments">) =>
  (b.contractValue ?? 0) * (b.model === "retainer" ? Math.max(1, b.installments) : 1);

/** Installment schedule preview: same rules as work_generate_installments(). */
export function previewInstallments(b: ClientBilling) {
  if (!b.contractValue || !b.firstDueOn) return [];
  const split = b.model === "retainer" ? [] : b.installmentSplit.filter((n) => n > 0);
  const n = split.length || Math.max(1, b.installments);
  const total = split.length ? split.reduce((a, x) => a + x, 0) : 100;
  return Array.from({ length: n }, (_, i) => {
    const pct = split.length ? split[i] / total : 1 / n;
    const d = new Date(`${b.firstDueOn}T12:00:00`);
    if (b.installmentFrequency === "biweekly") d.setDate(d.getDate() + i * 15);
    else d.setMonth(d.getMonth() + i);
    return { no: i + 1, of: n, due: d.toLocaleDateString("en-CA"), amount: Math.round(contractTotal(b) * pct), pct: Math.round(pct * 1000) / 10 };
  });
}
