import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClients, getProject, getUsers, requireManager } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { ProjectForm } from "@/components/work/forms/project-form";

export const metadata: Metadata = { title: "Editar proyecto · OR-K WORK" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireManager();
  const [project, clients, users] = await Promise.all([getProject(id), getClients(), getUsers()]);
  if (!project) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/work/projects/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {project.name}
      </Link>
      <PageHeader title="Editar proyecto" />
      <ProjectForm project={project} clients={clients} users={users} />
    </div>
  );
}
