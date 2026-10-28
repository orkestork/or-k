import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { EMPTY_BILLING, getUsers, requireManager } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { ClientForm } from "@/components/work/forms/client-form";

export const metadata: Metadata = { title: "Nuevo cliente · OR-K WORK" };

export default async function NewClientPage() {
  await requireManager();
  const users = await getUsers();
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/clients"} fallbackLabel={"Clientes"} />
      </Suspense>
      <PageHeader title="Nuevo cliente" description="Cuenta, contacto y equipo asignado." />
      <ClientForm users={users} billing={EMPTY_BILLING} />
    </div>
  );
}
