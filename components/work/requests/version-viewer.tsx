"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Download, ExternalLink, Eye, EyeOff, MousePointerClick, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { DesignMarker, FileVersion, WorkUserRecord } from "@/types/work/domain";
import { addMarkerAction, setMarkerResolvedAction, setVersionSharedAction } from "@/lib/work/actions";
import { relativeTime } from "@/lib/work/format";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Textarea } from "@/components/work/ui/textarea";
import { PersonAvatar } from "@/components/work/shared/people";

/** Signed Storage URLs accept `download` to force a file download. */
const downloadUrl = (url: string, name: string) =>
  `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;

/**
 * Shows a version's file (image with pinned feedback, PDF, video or a download
 * card), lets people switch versions and — for the team — share each version
 * with the client. Markers without a version are shown on the latest one.
 */
export function VersionViewer({
  requestId,
  versions,
  markers,
  users,
  canResolve,
  canShare = false,
  clientVerdicts = {},
  collapsible = false,
  onVersionChange,
}: {
  requestId: string;
  versions: FileVersion[];
  markers: DesignMarker[];
  users: WorkUserRecord[];
  canResolve: boolean;
  /** Team view: toggle what the client can see. */
  canShare?: boolean;
  /** Client's latest decision per version label (team view). */
  clientVerdicts?: Record<string, "approved" | "changes_requested">;
  /** Start with the preview folded (team view); the header stays visible. */
  collapsible?: boolean;
  onVersionChange?: (v: FileVersion) => void;
}) {
  const viewable = versions.filter((v) => v.fileUrl);
  const latest = viewable[viewable.length - 1];
  const [selectedId, setSelectedId] = useState(latest?.id ?? null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(!collapsible);

  if (!latest) return null;
  const version = viewable.find((v) => v.id === selectedId) ?? latest;
  const isLatest = version.id === latest.id;
  const pins = markers.filter((m) => m.versionId === version.id || (!m.versionId && isLatest));
  const userById = (id: string) => users.find((u) => u.id === id);
  const uploader = userById(version.uploadedById);

  const select = (v: FileVersion) => {
    setSelectedId(v.id);
    setDraft(null);
    onVersionChange?.(v);
  };

  const place = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDraft({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    setBody("");
  };

  const run = (fn: () => Promise<void>, ok?: string) =>
    start(async () => {
      try {
        await fn();
        if (ok) toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });

  const save = () =>
    draft &&
    run(async () => {
      await addMarkerAction({ requestId, versionId: version.id, x: draft.x, y: draft.y, body });
      setDraft(null);
      setBody("");
    }, "Marca añadida");

  return (
    <div className="flex flex-col gap-3">
      {/* version switcher */}
      {viewable.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {viewable.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => select(v)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs",
                v.id === version.id
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
              {v.id === latest.id ? <span className="font-sans">· actual</span> : null}
              {canShare && v.shared ? <Eye className="size-3" aria-label="Compartida con el cliente" /> : null}
            </button>
          ))}
        </div>
      ) : null}

      {/* version header */}
      <div className="flex flex-wrap items-start gap-3 rounded-md border border-border px-3 py-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded bg-muted font-mono text-xs font-semibold">
          {version.label}
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{version.fileName}</span>
            {clientVerdicts[version.label] === "approved" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tone-positive/15 px-2 py-0.5 text-xs text-tone-positive">
                <Check className="size-3" /> Aprobada por el cliente
              </span>
            ) : clientVerdicts[version.label] === "changes_requested" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-tone-warn/15 px-2 py-0.5 text-xs text-tone-warn">
                <RotateCcw className="size-3" /> El cliente pidió ajustes
              </span>
            ) : null}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {uploader ? <PersonAvatar person={uploader} size="xs" /> : null}
            {uploader?.name.split(" ")[0]} · {relativeTime(version.uploadedAt)}
          </p>
          {version.note ? <p className="mt-1 text-sm">{version.note}</p> : null}
        </div>
        <div className="flex items-center gap-1.5">
          {collapsible ? (
            <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Ocultar" : "Ver pieza"}
            </Button>
          ) : null}
          {canShare ? (
            <Button
              size="sm"
              variant={version.shared ? "secondary" : "outline"}
              disabled={pending}
              onClick={() =>
                run(
                  () => setVersionSharedAction(requestId, version.id, !version.shared),
                  version.shared ? "Ya no la ve el cliente" : `${version.label} compartida con el cliente`,
                )
              }
            >
              {version.shared ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              {version.shared ? "La ve el cliente" : "Compartir con cliente"}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" asChild>
            <a href={version.fileUrl} target="_blank" rel="noreferrer" aria-label="Abrir en otra pestaña">
              <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <a href={downloadUrl(version.fileUrl!, version.fileName)} aria-label="Descargar">
              <Download className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* the piece itself */}
      {!expanded ? null : version.kind === "image" ? (
        <>
          <div className="relative cursor-crosshair overflow-hidden rounded-md border border-border bg-muted/40" onClick={place}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
            <img src={version.fileUrl} alt={version.fileName} className="block w-full select-none" draggable={false} />
            {pins.map((m) => (
              <span
                key={m.id}
                title={m.body}
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                className={cn(
                  "absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold shadow ring-2 ring-white",
                  m.resolved ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {m.index}
              </span>
            ))}
            {draft ? (
              <span
                style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
                className="absolute size-6 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/70 ring-2 ring-white"
              />
            ) : null}
          </div>
          {draft ? (
            <div className="flex flex-col gap-2 rounded-md border border-primary/40 p-2">
              <Textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="¿Qué hay que cambiar en este punto?"
                className="min-h-14"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={pending || !body.trim()} onClick={save}>
                  Guardar marca
                </Button>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MousePointerClick className="size-3.5" /> Haz clic sobre la pieza para dejar una marca en ese punto.
            </p>
          )}
        </>
      ) : version.kind === "pdf" ? (
        <iframe
          src={`${version.fileUrl}#view=FitH`}
          title={version.fileName}
          className="h-[75vh] w-full rounded-md border border-border bg-muted/40"
        />
      ) : version.kind === "video" ? (
        <video src={version.fileUrl} controls className="max-h-[75vh] w-full rounded-md border border-border bg-black" />
      ) : (
        <a
          href={downloadUrl(version.fileUrl!, version.fileName)}
          className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-sm hover:border-primary/40"
        >
          <Download className="size-4" /> Descargar {version.fileName} para revisarlo
        </a>
      )}

      {/* pinned feedback */}
      {pins.length ? (
        <ul className="flex flex-col gap-2">
          {pins.map((m) => {
            const author = userById(m.authorId);
            return (
              <li key={m.id} className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    m.resolved ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
                  )}
                >
                  {m.index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={m.resolved ? "text-muted-foreground line-through" : ""}>{m.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {author?.name.split(" ")[0] ?? "Cliente"} · {relativeTime(m.createdAt)}
                    {m.resolved ? " · resuelta" : ""}
                  </p>
                </div>
                {canResolve ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={pending}
                    onClick={() => run(() => setMarkerResolvedAction(requestId, m.id, !m.resolved))}
                  >
                    {m.resolved ? <RotateCcw className="size-3.5" /> : <Check className="size-3.5" />}
                    {m.resolved ? "Reabrir" : "Resuelta"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
