"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Client, ClientBilling, WorkUserRecord } from "@/types/work/domain";
import { BillingFields } from "@/components/work/clients/billing-fields";
import { saveClientAction, type FormState } from "@/lib/work/actions";
import { Button } from "@/components/work/ui/button";
import { Card, CardContent } from "@/components/work/ui/card";
import { Input } from "@/components/work/ui/input";
import { Label } from "@/components/work/ui/label";
import { FormMessage, MemberPicker, SelectField, TextInput } from "./fields";
import { ActionForm } from "@/components/work/forms/action-form";

const TAX_REGIMES = [
  "Responsable de IVA",
  "No responsable de IVA",
  "Régimen Simple de Tributación (SIMPLE)",
  "Gran contribuyente",
  "Autorretenedor",
  "Entidad sin ánimo de lucro",
  "Persona natural",
];

export function ClientForm({
  client,
  users,
  billing,
  hasPlan = false,
}: {
  client?: Client;
  users: WorkUserRecord[];
  billing: ClientBilling;
  hasPlan?: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveClientAction, { error: null });
  const staff = users.filter((u) => u.active && u.role !== "client");

  return (
    <Card>
      <CardContent className="p-5">
        <ActionForm action={action} className="grid gap-4">
          {client ? <input type="hidden" name="id" value={client.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-[1fr_6rem_6rem]">
            <TextInput name="name" label="Nombre del cliente" defaultValue={client?.name} required />
            <TextInput name="logoText" label="Sigla" defaultValue={client?.logoText} placeholder="KL" />
            <div className="grid gap-2">
              <Label htmlFor="accentColor">Color</Label>
              <Input
                id="accentColor"
                name="accentColor"
                type="color"
                defaultValue={client?.accentColor ?? "#e31572"}
                className="h-9 p-1"
              />
            </div>
          </div>
          <TextInput name="industry" label="Industria" defaultValue={client?.industry} placeholder="Salud · Consumo" />

          <p className="mt-2 text-sm font-medium">Datos de la empresa</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="legalName" label="Razón social" defaultValue={client?.legal.legalName} />
            <TextInput name="taxId" label="NIT" defaultValue={client?.legal.taxId} placeholder="900.123.456-7" />
            <SelectField name="taxRegime" label="Régimen / responsabilidad" defaultValue={client?.legal.taxRegime}>
              <option value="">Sin definir</option>
              {TAX_REGIMES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </SelectField>
            <TextInput
              name="billingEmail"
              label="Correo de facturación"
              type="email"
              defaultValue={client?.legal.billingEmail}
            />
            <TextInput name="address" label="Dirección" defaultValue={client?.legal.address} />
            <TextInput name="city" label="Ciudad" defaultValue={client?.legal.city} />
            <TextInput name="country" label="País" defaultValue={client?.legal.country ?? "Colombia"} />
            <TextInput name="website" label="Sitio web" defaultValue={client?.legal.website} placeholder="https://" />
          </div>

          <p className="mt-2 text-sm font-medium">Facturación y pagos</p>
          <BillingFields initial={billing} hasPlan={hasPlan} />

          <p className="mt-2 text-sm font-medium">Contacto principal</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="contactName" label="Nombre" defaultValue={client?.contact.name} />
            <TextInput name="contactRole" label="Cargo" defaultValue={client?.contact.role} />
            <TextInput name="contactEmail" label="Correo" type="email" defaultValue={client?.contact.email} />
            <TextInput name="contactPhone" label="Teléfono" defaultValue={client?.contact.phone} />
          </div>

          <SelectField name="accountManagerId" label="Responsable de cuenta" defaultValue={client?.accountManagerId}>
            <option value="">Sin asignar</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.title ? ` — ${u.title}` : ""}
              </option>
            ))}
          </SelectField>
          <MemberPicker name="teamIds" label="Equipo asignado" users={users} selected={client?.teamIds ?? []} />

          <FormMessage error={state.error} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={client ? `/work/clients/${client.id}` : "/work/clients"}>Cancelar</Link>
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {client ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
