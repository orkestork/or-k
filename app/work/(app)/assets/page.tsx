import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Images } from "lucide-react";
import { getAssets, getClients, getUsers } from "@/lib/work/data";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { relativeTime } from "@/lib/work/format";
import { PageHeader, ClientMark } from "@/components/work/shared/page-header";
import { EmptyState } from "@/components/work/shared/empty-state";
import { Card } from "@/components/work/ui/card";
import { ASSET_LABEL, AssetUploader } from "@/components/work/assets/asset-uploader";
import { AssetDelete } from "@/components/work/assets/asset-delete";
import { SearchFilter } from "@/components/work/shared/search-filter";
import { clientOptions } from "@/components/work/shared/filter-options";

export const metadata: Metadata = { title: "Assets · OR-K WORK" };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const [assets, clients, users] = await Promise.all([getAssets(), getClients(), getUsers()]);
  const list = assets.filter(
    (a) => (!sp.client || a.clientId === sp.client) && (!sp.category || a.category === sp.category),
  );
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-xs transition-colors ${
      active
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:text-foreground"
    }`;
  const qs = (patch: Record<string, string | undefined>) => {
    const next = Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][];
    return next.length ? `?${new URLSearchParams(next)}` : "";
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Assets"
        description="Biblioteca por cliente: logos, tipografías, fotografía, plantillas."
        actions={supabaseConfigured ? <AssetUploader clients={clients} clientId={sp.client} /> : null}
      >
        <SearchFilter
          param="client"
          label="Cliente"
          allLabel="Todos los clientes"
          placeholder="Buscar cliente…"
          options={clientOptions(clients)}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href={`/work/assets${qs({ category: undefined })}`} className={chip(!sp.category)}>
            Todas
          </Link>
          {Object.entries(ASSET_LABEL).map(([k, v]) => (
            <Link key={k} href={`/work/assets${qs({ category: k })}`} className={chip(sp.category === k)}>
              {v}
            </Link>
          ))}
        </div>
      </PageHeader>

      {list.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Sin assets"
          description={clients.length ? "Sube logos, brandbooks o fotografía de tus clientes." : "Crea un cliente para empezar su biblioteca."}
        />
      ) : (
        <Card className="gap-0 py-0">
          <ul className="divide-y divide-border">
            {list.map((a) => {
              const client = clients.find((c) => c.id === a.clientId);
              const by = users.find((u) => u.id === a.addedBy);
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  {client ? (
                    <ClientMark name={client.name} logoText={client.logoText} color={client.accentColor} size={24} />
                  ) : null}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {ASSET_LABEL[a.category]}
                  </span>
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-1 truncate hover:text-primary"
                    >
                      <span className="truncate">{a.name}</span>
                      <ExternalLink className="size-3 shrink-0 opacity-60" />
                    </a>
                  ) : (
                    <span className="truncate">{a.name}</span>
                  )}
                  <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {by?.name.split(" ")[0] ?? ""} · {relativeTime(a.addedAt)}
                  </span>
                  {supabaseConfigured ? <AssetDelete id={a.id} clientId={a.clientId} name={a.name} /> : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
