import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { getClients, getUsers, requireManager } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { EmptyState } from "@/components/work/shared/empty-state";
import { ProjectForm } from "@/components/work/forms/project-form";
import { Button } from "@/components/work/ui/button";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Nuevo proyecto · OR-K WORK" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  await requireManager();
  const [allClients, users] = await Promise.all([getClients(), getUsers()]);
  const clients = allClients.filter((c) => c.active);
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/projects"} fallbackLabel={"Proyectos"} />
      </Suspense>
      <PageHeader title="Nuevo proyecto" description="Agrupa las solicitudes de una campaña o entregable." />
      {clients.length === 0 ? (
        <div className="flex flex-col items-center gap-3">
          <EmptyState icon={Users} title="Primero crea un cliente" description="Cada proyecto pertenece a un cliente." />
          <Button size="sm" asChild>
            <Link href="/work/clients/new">Nuevo cliente</Link>
          </Button>
        </div>
      ) : (
        <ProjectForm clients={clients} users={users} defaultClientId={client} />
      )}
    </div>
  );
}
