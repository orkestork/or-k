import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EMPTY_HR, getMe, getPayrollParams, getUsers, isAdmin } from "@/lib/work/data";
import { isHr } from "@/lib/work/people";
import { adminConfigured } from "@/lib/work/supabase/admin";
import { PageHeader } from "@/components/work/shared/page-header";
import { NewMemberWizard } from "@/components/work/hr/new-member-wizard";

export const metadata: Metadata = { title: "Nueva persona · OR-K WORK" };

export default async function NewMemberPage() {
  const me = await getMe();
  if (!isAdmin(me) && !isHr(me?.role)) redirect("/work/team");
  const [users, params] = await Promise.all([getUsers(), getPayrollParams()]);
  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/work/team" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Equipo
      </Link>
      <PageHeader
        title="Nueva persona"
        description="Cuenta de acceso, vinculación (laboral o prestación de servicios), seguridad social, pago y datos personales."
      />
      {adminConfigured ? (
        <NewMemberWizard users={users} emptyHr={EMPTY_HR("")} params={params} />
      ) : (
        <p className="text-sm text-muted-foreground">Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear cuentas.</p>
      )}
    </div>
  );
}
