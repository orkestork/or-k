import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClient, getClientDoc, getUsers } from "@/lib/work/data";
import { relativeTime } from "@/lib/work/format";
import { ClientMark } from "@/components/work/shared/page-header";
import { DocEditor } from "@/components/work/docs/doc-editor";

export const metadata: Metadata = { title: "Documento · OR-K WORK" };

export default async function ClientDocPage({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const [client, doc, users] = await Promise.all([
    getClient(id),
    docId === "new" ? Promise.resolve(null) : getClientDoc(docId),
    getUsers(),
  ]);
  if (!client || (docId !== "new" && (!doc || doc.clientId !== id))) notFound();
  const editor = doc ? users.find((u) => u.id === doc.updatedBy) : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/work/clients/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        <ClientMark name={client.name} logoText={client.logoText} color={client.accentColor} size={18} />
        {client.name}
      </Link>
      {doc ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Actualizado {relativeTime(doc.updatedAt)}
          {editor ? ` por ${editor.name.split(" ")[0]}` : ""}
        </p>
      ) : null}
      <DocEditor key={doc?.id ?? "new"} clientId={id} doc={doc ?? undefined} />
    </div>
  );
}
