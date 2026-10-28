"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { WorkUserRecord } from "@/types/work/domain";
import { setApproverAction } from "@/lib/work/actions";
import { nativeSelectClass } from "@/components/work/forms/fields";

export function ApproverSelect({
  requestId,
  approverId,
  users,
}: {
  requestId: string;
  approverId: string | null;
  users: WorkUserRecord[];
}) {
  const [pending, start] = useTransition();
  const staff = users.filter((u) => (u.active && u.role !== "client") || u.id === approverId);
  return (
    <select
      aria-label="Quién aprueba"
      disabled={pending}
      defaultValue={approverId ?? ""}
      className={nativeSelectClass}
      onChange={(e) => {
        const value = e.target.value || null;
        start(async () => {
          try {
            await setApproverAction(requestId, value);
            toast.success(value ? "Aprobador definido" : "Aprueba quien tenga la etapa");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo guardar");
          }
        });
      }}
    >
      <option value="">Quien tenga la etapa (por rol)</option>
      {staff.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
          {u.away ? " (off)" : ""}
        </option>
      ))}
    </select>
  );
}
