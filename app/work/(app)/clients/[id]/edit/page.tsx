import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EMPTY_BILLING, getClient, getClientBilling, getClientIncome, getMe, getUsers, isAdmin, requireManager } from "@/lib/work/data";
import { adminConfigured } from "@/lib/work/supabase/admin";
import { PortalAccess } from "@/components/work/clients/portal-access";
import { Card } from "@/components/work/ui/card";
import { PageHeader } from "@/components/work/shared/page-header";
import { ClientForm } from "@/components/work/forms/client-form";

export const metadata: Metadata = { title: "Editar cliente · OR-K WORK" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireManager();
  const [client, users, me, billing, income] = await Promise.all([
    getClient(id),
    getUsers(),
    getMe(),
    getClientBilling(id),
    getClientIncome(id),
  ]);
  if (!client) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/work/clients/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {client.name}
      </Link>
      <PageHeader title="Editar cliente" />
      <ClientForm
        client={client}
        users={users}
        billing={billing ?? EMPTY_BILLING}
        hasPlan={income.some((i) => i.installmentNo)}
      />
      <Card className="mt-4 gap-3 p-5">
        <div>
          <p className="text-sm font-medium">Acceso al portal</p>
          <p className="text-xs text-muted-foreground">Usuarios de {client.name} que pueden entrar a revisar y aprobar.</p>
        </div>
        <PortalAccess
          client={client}
          members={users.filter((u) => u.role === "client" && u.clientId === client.id)}
          canManage={isAdmin(me)}
          canCreate={adminConfigured}
        />
      </Card>
    </div>
  );
}
