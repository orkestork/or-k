import { Suspense } from "react";
import { BackLink } from "@/components/work/shell/nav-trail";
import type { Metadata } from "next";
import Link from "next/link";
import { getClients, getProjects, getUsers } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { NewRequestForm } from "@/components/work/forms/new-request-form";
import { Card, CardContent } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";

export const metadata: Metadata = { title: "Nueva solicitud · OR-K WORK" };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [allClients, allProjects, users] = await Promise.all([
    getClients(),
    getProjects(),
    getUsers(),
  ]);
  // Inactive clients keep their history but don't take new work.
  const clients = allClients.filter((c) => c.active);
  const projects = allProjects.filter((p) => clients.some((c) => c.id === p.clientId));

  return (
    <div className="mx-auto max-w-3xl">
      <Suspense fallback={null}>
        <BackLink fallbackHref={"/work/requests"} fallbackLabel={"Solicitudes"} />
      </Suspense>
      <PageHeader
        title="Nueva solicitud"
        description="Se genera un ID automático (ORK-AAAA-0000) y entra al flujo en estado Solicitud. Puedes sumar subtareas y archivos desde ya."
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm font-medium">Primero necesitas un proyecto</p>
            <p className="text-sm text-muted-foreground">
              Cada solicitud pertenece a un proyecto de un cliente.
            </p>
            <Button size="sm" asChild>
              <Link href={clients.length ? "/work/projects/new" : "/work/clients/new"}>
                {clients.length ? "Nuevo proyecto" : "Nuevo cliente"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-5">
          <NewRequestForm projects={projects} clients={clients} users={users} defaultProjectId={sp.project} />
        </CardContent>
      </Card>
      )}
    </div>
  );
}
