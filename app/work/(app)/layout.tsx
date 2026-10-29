import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/work/supabase/server";
import { getCurrentUser } from "@/lib/work/auth/session";
import { getNotifications } from "@/lib/work/data";
import { signOut } from "@/lib/work/auth/actions";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { WorkShell } from "@/components/work/shell/work-shell";
import { Toaster } from "@/components/work/ui/sonner";

// The workspace reads a live (mutable, time-relative) data store, so every
// page renders per request rather than being prerendered at build time.
export const dynamic = "force-dynamic";

export default async function WorkAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Once Supabase is connected, an unauthenticated visitor is bounced to login
  // (the middleware also enforces this). In preview mode we let the shell render.
  if (supabaseConfigured && !user) {
    redirect("/work/login");
  }

  if (user && user.role === "client") {
    redirect("/work/portal");
  }

  if (user && !user.active) {
    return <PendingAccess email={user.email} />;
  }

  // Recurring tasks are created lazily: whoever opens the workspace triggers the
  // ones that are due, after the response is sent. The SQL side is idempotent.
  // (cookies can't be read inside after() from a Server Component, so the
  // client is created first.)
  if (supabaseConfigured && user) {
    const supabase = await createClient();
    after(async () => {
      await supabase.rpc("work_run_recurrences");
    });
  }

  const notifications = user ? await getNotifications() : [];

  return (
    <>
      <WorkShell user={user} notifications={notifications}>{children}</WorkShell>
      <Toaster position="bottom-right" />
    </>
  );
}

function PendingAccess({ email }: { email: string }) {
  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="max-w-sm rounded-lg border border-border p-6 text-center">
        <p className="text-sm font-medium">Cuenta pendiente de activación</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {email} todavía no tiene acceso a OR-K WORK. Un administrador debe
          activarla desde Settings.
        </p>
        <form action={signOut} className="mt-4">
          <button type="submit" className="text-sm text-primary hover:underline">
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
