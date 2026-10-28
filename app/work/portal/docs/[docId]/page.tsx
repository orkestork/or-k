import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientDoc } from "@/lib/work/data";
import { relativeTime } from "@/lib/work/format";
import { Card } from "@/components/work/ui/card";
import { Markdown } from "@/components/work/docs/markdown";

export const metadata: Metadata = { title: "Documento · OR-K" };

export default async function PortalDocPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  // RLS only returns docs shared with this client.
  const doc = await getClientDoc(docId);
  if (!doc) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/work/portal" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Tus piezas
      </Link>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-xs text-muted-foreground">Actualizado {relativeTime(doc.updatedAt)}</p>
      </div>
      <Card className="p-5">
        <Markdown source={doc.body} />
      </Card>
    </div>
  );
}
