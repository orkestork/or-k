"use client";

import { useState, useTransition } from "react";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import type { Request } from "@/types/work/domain";
import { saveCopyAction } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/work/ui/dialog";

type CopyFields = Omit<Request["copy"], "drafts">;

const FIELDS: { key: keyof CopyFields; label: string; long?: boolean }[] = [
  { key: "concept", label: "Concepto creativo", long: true },
  { key: "headline", label: "Headline" },
  { key: "subheadline", label: "Subheadline" },
  { key: "caption", label: "Caption", long: true },
  { key: "cta", label: "CTA" },
  { key: "visualIdeas", label: "Ideas visuales", long: true },
  { key: "notes", label: "Notas internas", long: true },
];

export function CopyEditor({ requestId, copy }: { requestId: string; copy: Request["copy"] }) {
  const { drafts: _drafts, ...initial } = copy;
  const [values, setValues] = useState<CopyFields>(initial);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="self-start">
          <PenLine className="size-4" /> {copy.concept ? "Editar copy" : "Escribir copy"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Copy workspace</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={`copy-${f.key}`}>{f.label}</Label>
              {f.long ? (
                <Textarea
                  id={`copy-${f.key}`}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="min-h-16"
                />
              ) : (
                <Input
                  id={`copy-${f.key}`}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await saveCopyAction(requestId, values);
                  setOpen(false);
                  toast.success("Copy guardado");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "No se pudo guardar");
                }
              })
            }
          >
            Guardar borrador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
