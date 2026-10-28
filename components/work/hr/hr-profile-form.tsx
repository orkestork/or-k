"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import type { HrProfile } from "@/types/work/domain";
import type { PayrollParams } from "@/lib/work/payroll";
import { saveHrProfileAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { HrFields } from "./hr-fields";
import { CostSummary } from "./cost-summary";

/**
 * Employee file. HR edits everything; the employee keeps personal/contact data
 * current; contract, pay, banking and social security are read-only for them.
 */
export function HrProfileForm({
  profile,
  canEditAll,
  canEditPersonal,
  showPay,
  params,
}: {
  profile: HrProfile;
  canEditAll: boolean;
  canEditPersonal: boolean;
  showPay: boolean;
  params: PayrollParams;
}) {
  const [p, setP] = useState(profile);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(p) !== JSON.stringify(profile);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="grid gap-6">
        <HrFields
          value={p}
          onChange={setP}
          sections={["contract", "social", "bank", "personal", "notes"]}
          canEditAll={canEditAll}
          canEditPersonal={canEditPersonal}
          showPay={showPay}
        />
        {canEditAll || canEditPersonal ? (
          <div className="flex items-center justify-end gap-3">
            {!canEditAll ? (
              <p className="mr-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" /> Contrato, pago, banco y seguridad social los actualiza Talento humano.
              </p>
            ) : null}
            <Button
              size="sm"
              disabled={!dirty || pending}
              onClick={() =>
                start(async () => {
                  try {
                    await saveHrProfileAction(p);
                    toast.success("Ficha guardada");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "No se pudo guardar");
                  }
                })
              }
            >
              Guardar ficha
            </Button>
          </div>
        ) : null}
      </div>
      {showPay ? (
        <aside className="h-fit rounded-md border border-border p-4 lg:sticky lg:top-4">
          <CostSummary profile={p} params={params} />
        </aside>
      ) : null}
    </div>
  );
}
