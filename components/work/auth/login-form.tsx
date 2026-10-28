"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type AuthState } from "@/lib/work/auth/actions";
import { Button } from "@/components/work/ui/button";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { PasswordInput } from "@/components/work/forms/password-input";
import { ActionForm } from "@/components/work/forms/action-form";

const initialState: AuthState = { error: null };

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/work";
  const [state, formAction, pending] = useActionState(
    signInWithPassword,
    initialState,
  );

  return (
    <ActionForm action={formAction} className="grid gap-4">
      <input type="hidden" name="redirect" value={redirectTo} />

      <div className="grid gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nombre@or-k.co"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
        >
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </ActionForm>
  );
}
