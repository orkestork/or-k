"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PermissionKey, PermissionLevel, WorkUserRecord } from "@/types/work/domain";
import { updateMemberPermissionsAction } from "@/lib/work/actions";
import { PERMISSION_LEVEL_LABEL, PERMISSION_MODULES, roleDefault } from "@/lib/work/people";
import { Button } from "@/components/work/ui/button";
import { nativeSelectClass } from "@/components/work/forms/fields";

/** Super-admin-only editor of what one person can see and edit, module by module. */
export function PermissionsEditor({ member }: { member: WorkUserRecord }) {
  const saved = member.permissions ?? {};
  const [perms, setPerms] = useState<Partial<Record<PermissionKey, PermissionLevel>>>(saved);
  const [pending, start] = useTransition();
  const dirty = PERMISSION_MODULES.some((m) => perms[m.key] !== saved[m.key]);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border">
        {PERMISSION_MODULES.map((m) => {
          const byRole = roleDefault(member.role, m.key);
          return (
            <li key={m.key} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.hint}</p>
              </div>
              <select
                aria-label={m.label}
                value={perms[m.key] ?? ""}
                onChange={(e) =>
                  setPerms((p) => {
                    const next = { ...p };
                    if (e.target.value) next[m.key] = e.target.value as PermissionLevel;
                    else delete next[m.key];
                    return next;
                  })
                }
                className={`${nativeSelectClass} sm:w-56`}
              >
                <option value="">Según su rol · {PERMISSION_LEVEL_LABEL[byRole]}</option>
                {m.levels.map((l) => (
                  <option key={l} value={l}>
                    {PERMISSION_LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Las solicitudes que tiene asignadas las sigue viendo y trabajando siempre.
        </p>
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              try {
                await updateMemberPermissionsAction(member.id, perms);
                toast.success("Permisos actualizados");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "No se pudieron guardar los permisos");
              }
            })
          }
        >
          Guardar permisos
        </Button>
      </div>
    </div>
  );
}
