"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { RoleSlug, WorkUserRecord } from "@/types/work/domain";
import { updateMemberAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { RoleOptions } from "./role-options";
import { roleArea } from "./roles";

/** Admin-only inline editor for a member's role and job title. */
export function MemberEditor({
  member,
  isSelf,
  users = [],
}: {
  member: WorkUserRecord;
  isSelf: boolean;
  users?: WorkUserRecord[];
}) {
  const [role, setRole] = useState<RoleSlug>(member.role);
  const [title, setTitle] = useState(member.title);
  const [managerId, setManagerId] = useState(member.managerId ?? "");
  const [backupId, setBackupId] = useState(member.backupId ?? "");
  const managers = users.filter((u) => u.id !== member.id && u.active && u.role !== "client");
  const [pending, start] = useTransition();
  const dirty =
    role !== member.role ||
    title !== member.title ||
    managerId !== (member.managerId ?? "") ||
    backupId !== (member.backupId ?? "");

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
      <div className="grid gap-1.5">
        <Label htmlFor="member-title">Cargo</Label>
        <Input id="member-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="member-role">
          Rol <span className="font-normal text-muted-foreground">· {roleArea(role)}</span>
        </Label>
        <select
          id="member-role"
          value={role}
          disabled={isSelf}
          onChange={(e) => setRole(e.target.value as RoleSlug)}
          className={nativeSelectClass}
        >
          <RoleOptions />
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="member-manager">Jefe directo</Label>
        <select
          id="member-manager"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          className={nativeSelectClass}
        >
          <option value="">Nadie (cabeza)</option>
          {managers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="member-backup">Reemplazo por defecto</Label>
        <select
          id="member-backup"
          value={backupId}
          onChange={(e) => setBackupId(e.target.value)}
          className={nativeSelectClass}
        >
          <option value="">Su jefe directo</option>
          {managers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <Button
        size="sm"
        disabled={!dirty || pending}
        onClick={() =>
          start(async () => {
            try {
              await updateMemberAction(member.id, {
                title,
                ...(role !== member.role ? { role } : {}),
                ...(managerId !== (member.managerId ?? "") ? { managerId: managerId || null } : {}),
                ...(backupId !== (member.backupId ?? "") ? { backupId: backupId || null } : {}),
              });
              toast.success("Integrante actualizado");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "No se pudo guardar");
            }
          })
        }
      >
        Guardar
      </Button>
    </div>
  );
}
