"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, RotateCcw, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { AdjustmentTarget, Request } from "@/types/work/domain";
import { WORKFLOW, nextState } from "@/lib/work/workflow";
import {
  advanceRequestAction,
  decideApprovalAction,
  registerAdjustmentAction,
  setRequestStateAction,
} from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/work/ui/select";

const REVIEW_STATES = [
  "copy_review",
  "creative_review",
  "account_review",
  "client_review",
] as const;

export function RequestActions({
  request,
  approval = { allowed: true, approverName: null },
  canSendToClient = true,
}: {
  request: Request;
  /** Management decides what reaches the client. */
  canSendToClient?: boolean;
  /** Internal reviews can be locked to one approver. */
  approval?: { allowed: boolean; approverName: string | null };
}) {
  const [pending, startTransition] = useTransition();
  const start: Runner = (fn) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
      }
    });
  const isReview = (REVIEW_STATES as readonly string[]).includes(request.state);
  const next = nextState(request.state);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isReview && !approval.allowed ? (
        <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
          Esperando aprobación de <span className="font-medium text-foreground">{approval.approverName}</span>
        </span>
      ) : isReview ? (
        <>
          <ApproveButton id={request.id} pending={pending} start={start} />
          <RequestChangesButton id={request.id} pending={pending} start={start} />
        </>
      ) : next ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await advanceRequestAction(request.id);
              toast.success(`Movido a ${WORKFLOW[next].label}`);
            })
          }
        >
          Mover a {WORKFLOW[next].label}
          <ArrowRight className="size-4" />
        </Button>
      ) : request.state === "adjustments" ? (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setRequestStateAction(request.id, "copy");
                toast.success("De vuelta a Copy");
              })
            }
          >
            Ajustar copy
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await setRequestStateAction(request.id, "design");
                toast.success("De vuelta a Diseño");
              })
            }
          >
            Ajustar diseño
          </Button>
        </>
      ) : null}


      {canSendToClient && approval.allowed && !["client_review", "approved", "scheduled", "published", "completed", "archived"].includes(request.state) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          title={request.versions.length ? "Pasa a Revisión del cliente y le comparte la última versión" : "Aún no hay versiones subidas"}
          onClick={() =>
            start(async () => {
              await setRequestStateAction(request.id, "client_review");
              toast.success("Enviada al cliente", {
                description: request.versions.length
                  ? "Ya puede verla y aprobarla en su portal."
                  : "Aún no tiene versiones: sube una para que tenga qué revisar.",
              });
            })
          }
        >
          <Send className="size-4" /> Enviar al cliente
        </Button>
      ) : null}

      <AdjustmentButton
        id={request.id}
        pending={pending}
        start={start}
        rounds={`${request.roundsUsed}/${request.roundsIncluded}`}
      />
    </div>
  );
}

type Runner = (fn: () => Promise<void>) => void;

function ApproveButton({ id, pending, start }: { id: string; pending: boolean; start: Runner }) {
  const [note, setNote] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" disabled={pending}>
          <Check className="size-4" /> Aprobar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar y continuar el flujo</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Nota de aprobación (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await decideApprovalAction(id, "approved", note || "Aprobado.");
                  toast.success("Aprobado");
                })
              }
            >
              Aprobar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestChangesButton({ id, pending, start }: { id: string; pending: boolean; start: Runner }) {
  const [note, setNote] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={pending}>
          <X className="size-4" /> Pedir cambios
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar cambios</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="¿Qué hay que ajustar?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || !note.trim()}
              onClick={() =>
                start(async () => {
                  await decideApprovalAction(id, "changes_requested", note);
                  toast("Cambios solicitados", { description: "Vuelve a la etapa anterior." });
                })
              }
            >
              Enviar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentButton({
  id,
  pending,
  start,
  rounds,
}: {
  id: string;
  pending: boolean;
  start: Runner;
  rounds: string;
}) {
  const [target, setTarget] = useState<AdjustmentTarget>("design");
  const [comment, setComment] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={pending}>
          <RotateCcw className="size-4" /> Ajustes ({rounds})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar ajustes del cliente</DialogTitle>
        </DialogHeader>
        <Select value={target} onValueChange={(v) => setTarget(v as AdjustmentTarget)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="copy">Copy</SelectItem>
            <SelectItem value="design">Diseño</SelectItem>
            <SelectItem value="copy_design">Copy + Diseño</SelectItem>
            <SelectItem value="information">Información</SelectItem>
            <SelectItem value="product">Producto</SelectItem>
            <SelectItem value="format">Formato</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Comentario del cliente"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancelar
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              size="sm"
              disabled={pending || !comment.trim()}
              onClick={() =>
                start(async () => {
                  await registerAdjustmentAction(id, target, comment);
                  toast("Ajuste registrado", {
                    description: "La pieza vuelve al equipo correspondiente.",
                  });
                })
              }
            >
              Registrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
