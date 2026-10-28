import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClients, getMe, getProjects, getRequest, getRequestsByProject, getUsers, isAdmin } from "@/lib/work/data";
import { updateRequestAction } from "@/lib/work/actions";
import { PageHeader } from "@/components/work/shared/page-header";
import { RequestFields } from "@/components/work/forms/request-fields";
import { DeleteRequestButton } from "@/components/work/requests/delete-request";
import { Card, CardContent } from "@/components/work/ui/card";
import { Button } from "@/components/work/ui/button";

export const metadata: Metadata = { title: "Editar solicitud · OR-K WORK" };

export default async function EditRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [request, me, projects, clients, users] = await Promise.all([
    getRequest(id),
    getMe(),
    getProjects(),
    getClients(),
    getUsers(),
  ]);
  if (!request) notFound();
  const siblings = (await getRequestsByProject(request.projectId))
    .filter((r) => r.id !== request.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!isAdmin(me)) redirect(`/work/requests/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/work/requests/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {id}
      </Link>
      <PageHeader title="Editar solicitud" description={<span className="font-mono">{id}</span>} />

      <Card>
        <CardContent className="p-5">
          {sp.error ? (
            <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Elige un proyecto y escribe un título.
            </p>
          ) : null}
          <form action={updateRequestAction} className="grid gap-6">
            <input type="hidden" name="id" value={id} />
            <RequestFields
              request={request}
              projects={projects}
              clients={clients}
              users={users}
              showState
              dependencyOptions={siblings.map((r) => ({ id: r.id, title: r.title }))}
            />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <DeleteRequestButton id={id} title={request.title} />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/work/requests/${id}`}>Cancelar</Link>
                </Button>
                <Button type="submit" size="sm">
                  Guardar cambios
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
