"use client";

import { Lock } from "lucide-react";
import type { HrProfile } from "@/types/work/domain";
import { ARL_LABEL, isEmployment } from "@/lib/work/payroll";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { Textarea } from "@/components/work/ui/textarea";
import { nativeSelectClass } from "@/components/work/forms/fields";
import { CONTRACT_LABEL } from "./labels";

export type HrSection = "contract" | "social" | "bank" | "personal" | "notes";

const EPS = ["Sura", "Sanitas", "Nueva EPS", "Compensar", "Salud Total", "Famisanar", "Coosalud", "Mutual Ser", "Aliansalud", "SOS"];
const PENSION = ["Colpensiones", "Porvenir", "Protección", "Colfondos", "Skandia"];
const SEVERANCE = ["Porvenir", "Protección", "Colfondos", "Skandia", "Fondo Nacional del Ahorro"];
const ARL = ["Sura", "Positiva", "Colmena", "Bolívar", "Axa Colpatria", "Liberty", "Equidad"];
const CAJA = ["Compensar", "Cafam", "Colsubsidio", "Comfama", "Comfenalco", "Comfandi", "Cajacopi", "Comfacundi"];

/**
 * Controlled employee-file fields. Which blocks show depends on the contract:
 * employees get social security and benefits, contractors get fee details.
 */
export function HrFields({
  value,
  onChange,
  sections,
  canEditAll,
  canEditPersonal,
  showPay,
}: {
  value: HrProfile;
  onChange: (next: HrProfile) => void;
  sections: HrSection[];
  canEditAll: boolean;
  canEditPersonal: boolean;
  showPay: boolean;
}) {
  const p = value;
  const set = <K extends keyof HrProfile>(k: K, v: HrProfile[K]) => onChange({ ...p, [k]: v });
  const employment = isEmployment(p.contractType);
  const has = (s: HrSection) => sections.includes(s);

  const lock = (hr: boolean) => (hr && !canEditAll ? <Lock className="size-3 text-muted-foreground" aria-label="Lo gestiona Talento humano" /> : null);
  const editable = (hr: boolean) => (hr ? canEditAll : canEditPersonal || canEditAll);

  const text = (k: keyof HrProfile, label: string, o: { hr?: boolean; type?: string; placeholder?: string; list?: string[] } = {}) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`hr-${k}`} className="flex items-center gap-1">
        {label} {lock(!!o.hr)}
      </Label>
      <Input
        id={`hr-${k}`}
        type={o.type ?? "text"}
        list={o.list ? `list-${k}` : undefined}
        value={(p[k] ?? "") as string | number}
        placeholder={o.placeholder}
        disabled={!editable(!!o.hr)}
        onChange={(e) =>
          set(
            k,
            (o.type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : o.type === "date"
                ? e.target.value || null
                : e.target.value) as never,
          )
        }
      />
      {o.list ? (
        <datalist id={`list-${k}`}>
          {o.list.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      ) : null}
    </div>
  );

  const select = <K extends keyof HrProfile>(k: K, label: string, options: [string, string][], hr = true) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`hr-${String(k)}`} className="flex items-center gap-1">
        {label} {lock(hr)}
      </Label>
      <select
        id={`hr-${String(k)}`}
        className={nativeSelectClass}
        value={String(p[k] ?? "")}
        disabled={!editable(hr)}
        onChange={(e) => set(k, (typeof p[k] === "number" ? Number(e.target.value) : e.target.value) as HrProfile[K])}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  const H = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h3>
  );

  return (
    <div className="grid gap-6 text-sm">
      {has("contract") ? (
        <section className="grid gap-3">
          <H>Vinculación</H>
          <div className="grid gap-3 sm:grid-cols-3">
            {select("contractType", "Tipo de contrato", Object.entries(CONTRACT_LABEL))}
            {text("startDate", "Fecha de ingreso", { type: "date", hr: true })}
            {text(
              "endDate",
              p.contractType === "indefinite" ? "Fin (si aplica)" : p.contractType === "work" ? "Terminación estimada de la obra" : "Fin del contrato",
              { type: "date", hr: true },
            )}
          </div>
          {p.contractType === "work" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="hr-workDescription" className="flex items-center gap-1">
                Obra o labor contratada {lock(true)}
              </Label>
              <Textarea
                id="hr-workDescription"
                value={p.workDescription}
                disabled={!canEditAll}
                onChange={(e) => set("workDescription", e.target.value)}
                placeholder="Ej. Desarrollo del sitio web e-commerce de Marwa. El contrato termina al entregar la obra."
                className="min-h-16"
              />
              <p className="text-xs text-muted-foreground">
                Contrato laboral (art. 45 C.S.T.): tiene salario, prestaciones y seguridad social completas, y termina al
                finalizar la obra o labor.
              </p>
            </div>
          ) : null}
          {employment ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {showPay ? text("salary", p.contractType === "apprentice" ? "Apoyo de sostenimiento (COP)" : "Salario mensual (COP)", { type: "number", hr: true }) : null}
              {select("workSchedule", "Jornada", [
                ["full_time", "Tiempo completo"],
                ["part_time", "Medio tiempo"],
                ["hourly", "Por horas"],
              ])}
              {showPay && p.contractType !== "apprentice" ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="hr-transport" className="flex items-center gap-1">
                    Auxilio de transporte {lock(true)}
                  </Label>
                  <select
                    id="hr-transport"
                    className={nativeSelectClass}
                    disabled={!canEditAll}
                    value={p.transportAllowance === null ? "auto" : p.transportAllowance ? "yes" : "no"}
                    onChange={(e) => set("transportAllowance", e.target.value === "auto" ? null : e.target.value === "yes")}
                  >
                    <option value="auto">Automático (hasta 2 SMMLV)</option>
                    <option value="yes">Sí</option>
                    <option value="no">No (trabajo remoto / no aplica)</option>
                  </select>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {showPay ? text("salary", "Honorarios (COP)", { type: "number", hr: true }) : null}
              {select("salaryPeriod", "Los honorarios son", [
                ["monthly", "Mensuales"],
                ["hourly", "Por hora"],
                ["project", "Por proyecto"],
              ])}
              {select("paymentFrequency", "Se paga", [
                ["monthly", "Mensual"],
                ["biweekly", "Quincenal"],
                ["per_delivery", "Por entrega / cuenta de cobro"],
              ])}
              {showPay ? text("contractValue", "Valor total del contrato (COP)", { type: "number", hr: true }) : null}
              {text("taxId", "NIT / RUT", { hr: true })}
              <label className="flex items-center gap-2 self-end pb-2">
                <input
                  type="checkbox"
                  checked={p.paysOwnSocialSecurity}
                  disabled={!canEditAll}
                  onChange={(e) => set("paysOwnSocialSecurity", e.target.checked)}
                />
                Paga su propia seguridad social (planilla independiente)
              </label>
            </div>
          )}
        </section>
      ) : null}

      {has("social") && (employment || p.paysOwnSocialSecurity) ? (
        <section className="grid gap-3">
          <H>Seguridad social {employment ? "" : "(la paga el contratista)"}</H>
          <div className="grid gap-3 sm:grid-cols-3">
            {text("eps", "EPS", { hr: true, list: EPS })}
            {text("pensionFund", "Fondo de pensión", { hr: true, list: PENSION })}
            {employment && p.contractType !== "apprentice" ? text("severanceFund", "Fondo de cesantías", { hr: true, list: SEVERANCE }) : null}
            {text("arl", "ARL", { hr: true, list: ARL })}
            {select("arlRiskLevel", "Nivel de riesgo ARL", ARL_LABEL.map((l, i) => [String(i + 1), l] as [string, string]))}
            {employment ? text("compensationFund", "Caja de compensación", { hr: true, list: CAJA }) : null}
          </div>
        </section>
      ) : null}

      {has("bank") && showPay ? (
        <section className="grid gap-3">
          <H>Pago</H>
          <div className="grid gap-3 sm:grid-cols-3">
            {text("bankName", "Banco", { hr: true, list: ["Bancolombia", "Davivienda", "BBVA", "Banco de Bogotá", "Nequi", "Daviplata", "Banco de Occidente", "Scotiabank Colpatria", "Banco Popular", "Itaú"] })}
            {select("bankAccountType", "Tipo de cuenta", [
              ["savings", "Ahorros"],
              ["checking", "Corriente"],
            ])}
            {text("bankAccountNumber", "Número de cuenta", { hr: true })}
          </div>
        </section>
      ) : null}

      {has("personal") ? (
        <>
          <section className="grid gap-3">
            <H>Datos personales</H>
            <div className="grid gap-3 sm:grid-cols-3">
              {select("documentType", "Tipo de documento", ["CC", "CE", "TI", "PPT", "Pasaporte", "NIT"].map((t) => [t, t] as [string, string]))}
              {text("documentNumber", "Número de documento", { hr: true })}
              {text("birthDate", "Fecha de nacimiento", { type: "date" })}
              {text("phone", "Celular")}
              {text("personalEmail", "Correo personal", { type: "email" })}
              {text("city", "Ciudad")}
            </div>
            {text("address", "Dirección de residencia")}
          </section>
          <section className="grid gap-3">
            <H>Contacto de emergencia</H>
            <div className="grid gap-3 sm:grid-cols-3">
              {text("emergencyName", "Nombre")}
              {text("emergencyRelation", "Parentesco", { placeholder: "Madre, pareja…" })}
              {text("emergencyPhone", "Teléfono")}
            </div>
          </section>
        </>
      ) : null}

      {has("notes") && canEditAll ? (
        <section className="grid gap-1.5">
          <Label htmlFor="hr-notes">Notas de Talento humano (privadas)</Label>
          <Textarea id="hr-notes" value={p.notes} onChange={(e) => set("notes", e.target.value)} />
        </section>
      ) : null}
    </div>
  );
}
