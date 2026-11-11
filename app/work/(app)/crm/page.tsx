import { requireManager, getUsers } from "@/lib/work/data";
import { getCrmRecords } from "@/lib/work/crm";
import { managesOperation } from "@/lib/work/people";
import { CrmWorkspace } from "@/components/work/crm/crm-workspace";
import { PageHeader } from "@/components/work/shared/page-header";
import { supabaseConfigured } from "@/lib/work/supabase/env";

export const metadata = { title: "Prospectos · ZCEO" };
export default async function CrmPage() {
  const me = await requireManager();
  let records;
  try { records = await getCrmRecords(); }
  catch { return <div><PageHeader title="Prospectos" description="Seguimiento comercial de oportunidades por cerrar" /><p role="alert" className="rounded-xl border p-6 text-sm">El CRM no pudo conectarse a su base de datos. Verifica la conexión y aplica la migración pendiente del CRM.</p></div>; }
  const users = await getUsers();
  return <CrmWorkspace records={records} users={users.filter(u => u.active && u.role !== "client")} canEdit={managesOperation(me)} preview={!supabaseConfigured} />;
}
