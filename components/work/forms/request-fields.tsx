import type { Client, Project, Request, WorkUserRecord } from "@/types/work/domain";
import { WORKFLOW_ORDER, WORKFLOW } from "@/lib/work/workflow";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { MemberPicker, nativeSelectClass } from "./fields";

const ymd = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-CA") : "");
const lines = (items?: string[]) => (items ?? []).join("\n");

/**
 * Fields shared by the new-request and edit-request forms, grouped the way the
 * team works: the task, who and when, what gets delivered, then the optional
 * creative brief for advertising pieces. `extra` renders after deliverables.
 */
export function RequestFields({
  request,
  projects,
  clients,
  users,
  defaultProjectId,
  showState = false,
  extra,
  dependencyOptions,
}: {
  request?: Request;
  projects: Project[];
  clients: Client[];
  users: WorkUserRecord[];
  defaultProjectId?: string;
  showState?: boolean;
  extra?: React.ReactNode;
  /** Other requests of the same project this one can depend on (edit form). */
  dependencyOptions?: { id: string; title: string }[];
}) {
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
  const staff = users.filter((u) => (u.active && u.role !== "client") || u.id === request?.assigneeId);
  const hasCreative = Boolean(
    request &&
      (request.audience || request.mainMessage || request.cta || request.formats.length || request.channels.length || request.references),
  );

  return (
    <>
      <FormSection title="Tarea">
        <div className="grid gap-2">
          <Label htmlFor="projectId">Proyecto</Label>
          <select
            id="projectId"
            name="projectId"
            required
            defaultValue={request?.projectId ?? defaultProjectId ?? ""}
            className={nativeSelectClass}
          >
            <option value="" disabled>
              Selecciona un proyecto
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {clientName(p.clientId)} · {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="title" label="Título" defaultValue={request?.title} required placeholder="Producción de fotografía" />
          <Field
            name="campaign"
            label="Fase o campaña"
            defaultValue={request?.campaign}
            placeholder="W2 · Producción 01"
          />
        </div>
        <TextField
          name="objective"
          label="Descripción"
          hint="qué hay que lograr"
          defaultValue={request?.objective}
          required
        />
      </FormSection>

      <FormSection title="Equipo y fechas">
        <div className={showState ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
          <div className="grid gap-2">
            <Label htmlFor="assigneeId">Responsable principal</Label>
            <select
              id="assigneeId"
              name="assigneeId"
              defaultValue={request?.assigneeId ?? ""}
              className={nativeSelectClass}
            >
              <option value="">Sin asignar</option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.title ? ` — ${u.title}` : ""}
                </option>
              ))}
            </select>
          </div>
          {showState ? (
            <div className="grid gap-2">
              <Label htmlFor="state">Estado</Label>
              <select id="state" name="state" defaultValue={request?.state} className={nativeSelectClass}>
                {WORKFLOW_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {WORKFLOW[s].label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <MemberPicker name="collaboratorIds" label="Colaboradores" users={users} selected={request?.collaboratorIds ?? []} />
        <div className="grid gap-2">
          <Label htmlFor="approverId">
            Aprueba <span className="font-normal text-muted-foreground">· da el visto bueno en las revisiones internas</span>
          </Label>
          <select id="approverId" name="approverId" defaultValue={request?.approverId ?? ""} className={nativeSelectClass}>
            <option value="">Quien tenga la etapa (por rol)</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.title ? ` — ${u.title}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="startOn">Inicio</Label>
            <Input id="startOn" name="startOn" type="date" defaultValue={request?.startOn ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deadline">Entrega</Label>
            <Input id="deadline" name="deadline" type="date" defaultValue={ymd(request?.deadline)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridad</Label>
            <select id="priority" name="priority" defaultValue={request?.priority ?? "medium"} className={nativeSelectClass}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roundsIncluded">Rondas de ajustes</Label>
            <Input
              id="roundsIncluded"
              name="roundsIncluded"
              type="number"
              min={0}
              max={10}
              defaultValue={request?.roundsIncluded ?? 2}
            />
          </div>
        </div>
        {dependencyOptions?.length ? (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
              Depende de <span className="font-normal text-muted-foreground">· no debería empezar antes de que estas se aprueben</span>
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {dependencyOptions.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
                >
                  <input type="checkbox" name="dependsOn" value={d.id} defaultChecked={request?.dependsOn?.includes(d.id)} />
                  <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                  <span className="truncate">{d.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </FormSection>

      <FormSection title="Entregables">
        <TextField
          name="deliverables"
          label="Qué se entrega"
          hint="uno por línea"
          defaultValue={lines(request?.deliverables)}
          placeholder={"Fotografía\nFichas de producto\nGrilla"}
        />
      </FormSection>

      {extra}

      <details className="group rounded-md border border-border" open={hasCreative}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Detalles creativos{" "}
          <span className="font-normal text-muted-foreground">· opcional, para piezas publicitarias</span>
        </summary>
        <div className="grid gap-4 border-t border-border p-4">
          <TextField name="audience" label="Público objetivo" defaultValue={request?.audience} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="mainMessage" label="Mensaje principal" defaultValue={request?.mainMessage} />
            <TextField name="cta" label="Llamado a la acción (CTA)" defaultValue={request?.cta} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="formats" label="Formatos" hint="ej. 1080×1080" defaultValue={lines(request?.formats)} />
            <TextField name="channels" label="Canales" hint="ej. Instagram" defaultValue={lines(request?.channels)} />
          </div>
          <TextField name="references" label="Referencias" defaultValue={request?.references} />
        </div>
      </details>

      <TextField name="observations" label="Observaciones" defaultValue={request?.observations} />
    </>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  required,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} />
    </div>
  );
}

function TextField({
  name,
  label,
  hint,
  required,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <Label htmlFor={name}>
        {label}
        {hint ? <span className="font-normal text-muted-foreground">· {hint}</span> : null}
      </Label>
      <Textarea
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-h-20"
      />
    </div>
  );
}
