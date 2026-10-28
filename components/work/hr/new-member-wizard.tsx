"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { toast } from "sonner";
import type { HrProfile, RoleSlug, WorkUserRecord } from "@/types/work/domain";
import type { PayrollParams } from "@/lib/work/payroll";
import { createMemberAction, saveHrProfileAction, setAvatarAction } from "@/lib/work/actions";
import { cn } from "@/lib/work/utils";
import { Button } from "@/components/work/ui/button";
import { Card } from "@/components/work/ui/card";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { PasswordInput } from "@/components/work/forms/password-input";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { RoleOptions } from "@/components/work/settings/role-options";
import { uploadAvatar } from "@/components/work/settings/avatar-upload";
import { HrFields } from "./hr-fields";
import { CostSummary } from "./cost-summary";

const STEPS = ["Cuenta", "Vinculación y pago", "Datos personales"] as const;

export function NewMemberWizard({
  users,
  emptyHr,
  params,
}: {
  users: WorkUserRecord[];
  emptyHr: HrProfile;
  params: PayrollParams;
}) {
  const router = useRouter();
  const staff = users.filter((u) => u.active && u.role !== "client");
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState({
    name: "",
    email: "",
    password: "",
    title: "",
    role: "designer" as RoleSlug,
    managerId: "",
    backupId: "",
  });
  const [hr, setHr] = useState<HrProfile>(emptyHr);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof account, v: string) => setAccount((a) => ({ ...a, [k]: v }));

  const accountError = () => {
    if (!account.name.trim()) return "Escribe el nombre.";
    if (!/^\S+@\S+\.\S+$/.test(account.email)) return "Escribe un correo válido.";
    if (account.password.length < 8) return "La contraseña temporal debe tener mínimo 8 caracteres.";
    return null;
  };

  const next = () => {
    const err = step === 0 ? accountError() : null;
    setError(err);
    if (!err) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const finish = () => {
    const err = accountError();
    if (err) {
      setStep(0);
      setError(err);
      return;
    }
    setError(null);
    start(async () => {
      const fd = new FormData();
      Object.entries(account).forEach(([k, v]) => fd.set(k, v));
      const res = await createMemberAction({ error: null }, fd);
      if (res.error || !res.id) {
        setError(res.error ?? "No se pudo crear la persona");
        setStep(0);
        return;
      }
      try {
        await saveHrProfileAction({ ...hr, userId: res.id });
        if (photo) await setAvatarAction(res.id, await uploadAvatar(res.id, photo));
      } catch (e) {
        toast.error(`La persona se creó, pero falta completar su ficha: ${e instanceof Error ? e.message : ""}`);
      }
      toast.success(`${account.name} ya hace parte del equipo`, {
        description: "Comparte su correo y la contraseña temporal; puede cambiarla en Settings.",
      });
      router.push(`/work/hr/${res.id}`);
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="gap-6 p-5">
        {/* stepper */}
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => (i < step || !accountError() ? setStep(i) : null)}
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                  i < step && "border-tone-positive bg-tone-positive text-white",
                  i === step && "border-primary bg-primary text-primary-foreground",
                  i > step && "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </button>
              <span className={cn("hidden text-sm sm:block", i === step ? "font-medium" : "text-muted-foreground")}>{label}</span>
              {i < STEPS.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="grid gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border border-dashed border-border bg-muted text-muted-foreground hover:border-primary/50"
                aria-label="Elegir foto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <Camera className="size-5" />}
              </button>
              <div className="text-sm">
                <p className="font-medium">Foto (opcional)</p>
                <p className="text-xs text-muted-foreground">También puede subirla después en Settings.</p>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPhoto(f);
                  setPreview(f ? URL.createObjectURL(f) : null);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo">
                <Input value={account.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Correo corporativo (para entrar)">
                <Input type="email" value={account.email} onChange={(e) => set("email", e.target.value)} placeholder="nombre@or-k.co" />
              </Field>
              <Field label="Cargo">
                <Input value={account.title} onChange={(e) => set("title", e.target.value)} placeholder="Diseñadora UX/UI" />
              </Field>
              <Field label="Contraseña temporal">
                <PasswordInput value={account.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </Field>
              <Field label="Rol en OR-K WORK">
                <select className={nativeSelectClass} value={account.role} onChange={(e) => set("role", e.target.value)}>
                  <RoleOptions />
                </select>
              </Field>
              <Field label="Jefe directo">
                <select className={nativeSelectClass} value={account.managerId} onChange={(e) => set("managerId", e.target.value)}>
                  <option value="">Nadie (cabeza del organigrama)</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.title ? ` — ${u.title}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Reemplazo por defecto (cuando falte)">
                <select className={nativeSelectClass} value={account.backupId} onChange={(e) => set("backupId", e.target.value)}>
                  <option value="">Su jefe directo</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        ) : step === 1 ? (
          <HrFields value={hr} onChange={setHr} sections={["contract", "social", "bank"]} canEditAll canEditPersonal showPay />
        ) : (
          <HrFields value={hr} onChange={setHr} sections={["personal", "notes"]} canEditAll canEditPersonal showPay />
        )}

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/work/team">Cancelar</Link>
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)} disabled={pending}>
                Atrás
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button size="sm" onClick={next}>
                Siguiente
              </Button>
            ) : null}
            <Button size="sm" variant={step < STEPS.length - 1 ? "outline" : "default"} onClick={finish} disabled={pending}>
              {pending ? "Creando…" : "Crear persona"}
            </Button>
          </div>
        </div>
      </Card>

      <aside className="flex h-fit flex-col gap-4 lg:sticky lg:top-4">
        <Card className="p-4">
          <CostSummary profile={hr} params={params} />
        </Card>
        <p className="text-xs text-muted-foreground">
          Puedes crear la persona desde cualquier paso; lo que falte se completa luego en su ficha de Recursos humanos.
        </p>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
