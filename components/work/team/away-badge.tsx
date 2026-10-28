import type { WorkUserRecord } from "@/types/work/domain";
import { ABSENCE_LABEL } from "@/lib/work/people";
import { cn } from "@/lib/work/utils";

const day = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short" });

/** "Off · De vacaciones hasta 30 oct · reemplaza Brandon". */
export function AwayBadge({
  person,
  users = [],
  compact = false,
  className,
}: {
  person: Pick<WorkUserRecord, "away">;
  users?: WorkUserRecord[];
  compact?: boolean;
  className?: string;
}) {
  if (!person.away) return null;
  const sub = person.away.substituteId ? users.find((u) => u.id === person.away!.substituteId) : undefined;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-tone-warn/15 px-2 py-0.5 text-xs text-tone-warn",
        className,
      )}
      title={`${ABSENCE_LABEL[person.away.kind]} hasta el ${day(person.away.until)}${sub ? ` · reemplaza ${sub.name}` : ""}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      Off{compact ? "" : ` · ${ABSENCE_LABEL[person.away.kind]} hasta ${day(person.away.until)}`}
      {!compact && sub ? ` · reemplaza ${sub.name.split(" ")[0]}` : ""}
    </span>
  );
}
