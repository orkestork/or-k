import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjects } from "@/lib/work/data";
import { Card } from "@/components/work/ui/card";
import { IntakeForm } from "@/components/work/portal/intake-form";

export const metadata: Metadata = { title: "Nueva solicitud · OR-K" };

export default async function PortalNewRequest() {
  // RLS returns only this client's projects.
  const projects = (await getProjects()).filter((p) => p.status !== "closed");
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/work/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Tus piezas
      </Link>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pedir algo nuevo</h1>
        <p className="text-sm text-muted-foreground">
          Llega directo al equipo de OR-K. Tu responsable de cuenta la revisa y te confirma tiempos.
        </p>
      </div>
      <Card className="p-5">
        {projects.length ? (
          <IntakeForm projects={projects} />
        ) : (
          <p className="text-sm text-muted-foreground">Aún no tienes proyectos activos. Escríbele a tu responsable de cuenta.</p>
        )}
      </Card>
    </div>
  );
}
