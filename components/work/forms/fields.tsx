import type { WorkUserRecord } from "@/types/work/domain";
import { cn } from "@/lib/work/utils";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { PasswordInput } from "./password-input";

export const nativeSelectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export function TextInput({
  name,
  label,
  defaultValue,
  required,
  type = "text",
  placeholder,
  minLength,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      {type === "password" ? (
        <PasswordInput
          id={name}
          name={name}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          minLength={minLength}
          autoComplete="new-password"
        />
      ) : (
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
        {hint ? <span className="ml-1 font-normal text-muted-foreground">· {hint}</span> : null}
      </Label>
      <Textarea id={name} name={name} defaultValue={defaultValue} className="min-h-16" />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  required,
  children,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={nativeSelectClass}
      >
        {children}
      </select>
    </div>
  );
}

/** Checkbox list that submits every checked user id under `name`. */
export function MemberPicker({
  name,
  label,
  users,
  selected,
}: {
  name: string;
  label: string;
  users: WorkUserRecord[];
  selected: string[];
}) {
  const staff = users.filter((u) => u.active && u.role !== "client");
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {staff.length === 0 ? (
        <p className="text-xs text-muted-foreground">Todavía no hay integrantes en el equipo.</p>
      ) : (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {staff.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5"
            >
              <input
                type="checkbox"
                name={name}
                value={u.id}
                defaultChecked={selected.includes(u.id)}
                className="accent-[var(--primary)]"
              />
              <span className="truncate">{u.name}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

export function FormMessage({ error, ok, okText }: { error: string | null; ok?: boolean; okText?: string }) {
  if (error) {
    return (
      <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (ok && okText) {
    return <p className={cn("text-sm text-tone-positive")}>{okText}</p>;
  }
  return null;
}
