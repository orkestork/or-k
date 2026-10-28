import { cn } from "@/lib/work/utils";
import { initials as toInitials } from "@/lib/work/format";
import type { WorkUserRecord } from "@/types/work/domain";

type PersonLike = Pick<WorkUserRecord, "name" | "color"> &
  Partial<Pick<WorkUserRecord, "initials" | "title" | "avatarUrl">>;

const SIZES = {
  xs: "size-5 text-[10px]",
  sm: "size-6 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-16 text-lg",
} as const;

export function PersonAvatar({
  person,
  size = "sm",
  className,
}: {
  person: PersonLike;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny avatar, public URL
      <img
        src={person.avatarUrl}
        alt={person.name}
        title={person.name}
        loading="lazy"
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-inset ring-white/10", SIZES[size], className)}
        style={{ backgroundColor: person.color }}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white/95 ring-1 ring-inset ring-white/10",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: person.color }}
      title={person.name}
    >
      {person.initials ?? toInitials(person.name)}
    </span>
  );
}

export function PersonInline({
  person,
  size = "sm",
  muted,
}: {
  person: PersonLike;
  size?: keyof typeof SIZES;
  muted?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <PersonAvatar person={person} size={size} />
      <span className={cn("text-sm", muted && "text-muted-foreground")}>
        {person.name}
      </span>
    </span>
  );
}

export function PersonStack({
  people,
  max = 4,
}: {
  people: PersonLike[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((p, i) => (
        <PersonAvatar
          key={p.name + i}
          person={p}
          size="sm"
          className="ring-2 ring-background"
        />
      ))}
      {rest > 0 ? (
        <span className="grid size-6 place-items-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
