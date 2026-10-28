"use client";

import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { markAllReadAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => markAllReadAction())}>
      <CheckCheck className="size-4" /> Marcar todo como leído
    </Button>
  );
}
