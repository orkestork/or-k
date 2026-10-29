import Link from "next/link";
import { cn } from "@/lib/work/utils";
import { Card } from "@/components/work/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "positive";
  /** Makes the card a link to the list behind the number. */
  href?: string;
}) {
  const card = (
    <Card className={cn("gap-1 p-4", href && "h-full transition-colors hover:border-primary/50")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-2xl font-semibold tabular-nums",
          tone === "warn" && "text-tone-warn",
          tone === "positive" && "text-tone-positive",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
