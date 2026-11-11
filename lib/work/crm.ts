"use server";

import { revalidatePath } from "next/cache";
import { getMe } from "@/lib/work/data";
import { managesOperation, seesAll } from "@/lib/work/people";
import { createClient } from "@/lib/work/supabase/server";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { CRM_STAGES, type CrmRecord, type CrmStage } from "./crm-types";

const preview = globalThis as unknown as { __zceoCrm?: CrmRecord[] };
async function authorize(edit = false) {
  const me = await getMe();
  if (!me?.active || !(edit ? managesOperation(me) : seesAll(me))) throw new Error("No tienes permiso para acceder al CRM.");
}
export async function getCrmRecords(): Promise<CrmRecord[]> {
  await authorize();
  if (!supabaseConfigured) return preview.__zceoCrm ?? [];
  const sb = await createClient();
  const { data, error } = await sb.from("crm_records").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error("No se pudo cargar el CRM. Verifica que su migración esté aplicada.");
  return data as CrmRecord[];
}
export async function saveCrmRecord(form: FormData): Promise<{ error?: string }> {
  try {
    await authorize(true);
    const str = (key: string) => String(form.get(key) ?? "").trim();
    const stage = str("stage");
    const value = Number(str("value"));
    const company = str("company");
    const email = str("email");
    const date = str("follow_up");
    if (!company || company.length > 200) throw new Error("Escribe una empresa de hasta 200 caracteres.");
    if (!Object.hasOwn(CRM_STAGES, stage)) throw new Error("Etapa inválida.");
    if (!Number.isFinite(value) || value < 0 || value > 1e15) throw new Error("El valor estimado no es válido.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Correo inválido.");
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))) throw new Error("Fecha inválida.");
    const existing = str("id");
    const record: CrmRecord = { id: existing || crypto.randomUUID(), company, contact: str("contact").slice(0, 200), email, phone: str("phone").slice(0, 80), stage: stage as CrmStage, owner_id: str("owner_id") || null, value, follow_up: date || null, notes: str("notes").slice(0, 10000), updated_at: new Date().toISOString() };
    if (!supabaseConfigured) {
      const rows = preview.__zceoCrm ?? [];
      if (existing && !rows.some(r => r.id === existing)) throw new Error("Registro no encontrado.");
      preview.__zceoCrm = [record, ...rows.filter(r => r.id !== record.id)];
    } else {
      const sb = await createClient();
      const result = existing
        ? await sb.from("crm_records").update(record).eq("id", existing).select("id").single()
        : await sb.from("crm_records").insert(record).select("id").single();
      if (result.error) throw new Error("No se pudo guardar. Verifica los datos e inténtalo otra vez.");
    }
    revalidatePath("/work/crm");
    return {};
  } catch (error) { return { error: error instanceof Error ? error.message : "No se pudo guardar." }; }
}

/** Updates only the stage, preserving contact details and notes. */
export async function moveCrmRecord(id: string, stage: CrmStage): Promise<{ error?: string }> {
  try {
    await authorize(true);
    if (!Object.hasOwn(CRM_STAGES, stage)) throw new Error("Etapa inválida.");
    if (!supabaseConfigured) {
      const record = preview.__zceoCrm?.find(r => r.id === id);
      if (!record) throw new Error("Prospecto no encontrado.");
      record.stage = stage;
      record.updated_at = new Date().toISOString();
    } else {
      const sb = await createClient();
      const { error } = await sb.from("crm_records").update({ stage, updated_at: new Date().toISOString() }).eq("id", id).select("id").single();
      if (error) throw new Error("No se pudo cambiar la etapa. Inténtalo de nuevo.");
    }
    revalidatePath("/work/crm");
    return {};
  } catch (error) { return { error: error instanceof Error ? error.message : "No se pudo cambiar la etapa." }; }
}
