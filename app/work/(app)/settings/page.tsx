import type { Metadata } from "next";
import { getAutomations, getClients, getMe, getProjects, getUsers, isAdmin } from "@/lib/work/data";
import { Automations } from "@/components/work/settings/automations";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { adminConfigured } from "@/lib/work/supabase/admin";
import { PageHeader } from "@/components/work/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/work/ui/card";
import { PasswordForm, ProfileForm } from "@/components/work/settings/profile-forms";
import { AvatarUpload } from "@/components/work/settings/avatar-upload";
import { NewMemberForm, TeamAdmin } from "@/components/work/settings/team-admin";

export const metadata: Metadata = { title: "Settings · OR-K WORK" };

export default async function SettingsPage() {
  const me = await getMe();
  if (!me || !supabaseConfigured) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Settings" description="Conecta Supabase para gestionar cuentas y roles." />
      </div>
    );
  }
  const admin = isAdmin(me);
  const [users, clients, automations, projects] = admin
    ? await Promise.all([getUsers(), getClients(), getAutomations(), getProjects()])
    : [[], [], [], []];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHeader title="Settings" description="Tu cuenta, el equipo y sus permisos." />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mi perfil</CardTitle>
          <CardDescription>{me.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <AvatarUpload person={me} />
          <ProfileForm me={me} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      {admin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Equipo y permisos · {users.length}</CardTitle>
              <CardDescription>
                Cambia roles, activa cuentas nuevas o vincula usuarios de cliente a su cuenta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamAdmin users={users} clients={clients} meId={me.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Automatizaciones · {automations.length}</CardTitle>
              <CardDescription>
                Se ejecutan solas en cada cambio de estado, venga del flujo, del tablero o del portal del cliente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Automations automations={automations} projects={projects} users={users} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Nuevo integrante</CardTitle>
              <CardDescription>
                Crea la cuenta con una contraseña temporal; la persona puede cambiarla aquí en Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adminConfigured ? (
                <NewMemberForm clients={clients} users={users} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Para crear usuarios desde aquí añade <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> en{" "}
                  <code className="font-mono">.env.local</code> y reinicia el servidor. Mientras tanto puedes crearlos en
                  Supabase → Authentication → Add user y activarlos en la lista de arriba.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
