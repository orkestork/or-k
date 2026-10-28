import type { Metadata } from "next";
import { getClients, getTemplates, getUsers, requireManager } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { TemplateList } from "@/components/work/projects/template-list";

export const metadata: Metadata = { title: "Plantillas · OR-K WORK" };

export default async function TemplatesPage() {
  await requireManager();
  const [templates, clients, users] = await Promise.all([getTemplates(), getClients(), getUsers()]);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Plantillas"
        description="Proyectos tipo que se crean con un clic: tareas, fechas, responsables y subtareas incluidos."
      />
      <TemplateList templates={templates} clients={clients} users={users} />
    </div>
  );
}
