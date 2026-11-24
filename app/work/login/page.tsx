import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/work/auth/login-form";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/work/ui/card";

export const metadata: Metadata = { title: "Entrar · O R-K WORK" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src="/assets/brand/ork-app-icon.svg" alt="" aria-hidden="true" className="size-8 shrink-0 rounded-md" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">O R-K WORK</p>
            <p className="text-xs text-muted-foreground">Operación interna</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Acceso exclusivo para el equipo de O R-K.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            {!supabaseConfigured ? (
              <p className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Modo previsualización: el backend (Supabase) todavía no está
                conectado.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
