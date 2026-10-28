import Link from "next/link";
import { redirect } from "next/navigation";
import { getClient, getMe } from "@/lib/work/data";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { signOut } from "@/lib/work/auth/actions";
import { Toaster } from "@/components/work/ui/sonner";
import { ThemeToggle } from "@/components/work/theme/theme-toggle";
import { ClientMark } from "@/components/work/shared/page-header";

export const dynamic = "force-dynamic";

/** Client-facing portal: only their account's requests, no internal tooling. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured) redirect("/work/home");
  const me = await getMe();
  if (!me) redirect("/work/login");
  if (me.role !== "client") redirect("/work/home");

  const client = me.active && me.clientId ? await getClient(me.clientId) : null;

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/work/portal" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              O
            </span>
            <span className="text-sm font-semibold tracking-tight">OR-K</span>
          </Link>
          {client ? (
            <span className="flex items-center gap-2 border-l border-border pl-3 text-sm text-muted-foreground">
              <ClientMark name={client.name} logoText={client.logoText} color={client.accentColor} size={22} />
              {client.name}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden text-sm sm:inline">{me.name}</span>
            <form action={signOut}>
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {me.active && client ? (
          children
        ) : (
          <div className="rounded-lg border border-border p-6 text-center">
            <p className="text-sm font-medium">Tu acceso está en preparación</p>
            <p className="mt-2 text-sm text-muted-foreground">
              El equipo de OR-K todavía no ha vinculado tu cuenta ({me.email}) a tu empresa. Escríbele a tu responsable
              de cuenta.
            </p>
          </div>
        )}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
