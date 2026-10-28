import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EMPTY_HR, getAbsenceHistory, getHrDocuments, getHrProfile, getMe, getPayrollParams, getUser, getUsers } from "@/lib/work/data";
import { isHr, seesPay, vacationBalance } from "@/lib/work/people";
import { PageHeader } from "@/components/work/shared/page-header";
import { PersonAvatar } from "@/components/work/shared/people";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";
import { AwayBadge } from "@/components/work/team/away-badge";
import { AbsenceManager } from "@/components/work/team/absence-manager";
import { HrProfileForm } from "@/components/work/hr/hr-profile-form";
import { HrDocuments } from "@/components/work/hr/hr-documents";
import { CONTRACT_LABEL, money, PERIOD_LABEL } from "@/components/work/hr/labels";

export const metadata: Metadata = { title: "Ficha de empleado · OR-K WORK" };

export default async function HrFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, person, users] = await Promise.all([getMe(), getUser(id), getUsers()]);
  if (!person) notFound();
  const isSelf = me?.id === person.id;
  const hr = isHr(me?.role);
  const pay = seesPay(me?.role);
  const manages = person.managerId === me?.id;
  if (!isSelf && !hr && !pay && !manages) redirect("/work/hr");

  const [file, documents, absences, payroll] = await Promise.all([
    isSelf || hr || pay ? getHrProfile(id) : Promise.resolve(null),
    isSelf || hr ? getHrDocuments(id) : Promise.resolve([]),
    getAbsenceHistory(id),
    getPayrollParams(),
  ]);
  const profile = file ?? EMPTY_HR(id);
  const bal = vacationBalance(profile.startDate, absences);
  const upcoming = absences.filter((a) => a.endOn >= new Date().toLocaleDateString("en-CA"));
  const past = absences.filter((a) => !upcoming.includes(a) && a.status === "approved");
  const day = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-7xl">
      {hr || pay ? (
        <Link href="/work/hr" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Recursos humanos
        </Link>
      ) : null}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PersonAvatar person={person} size="md" />
            {isSelf ? "Mi ficha" : person.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            {person.title}
            <AwayBadge person={person} users={users} />
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          {isSelf || hr || pay ? (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm">Ficha</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <HrProfileForm profile={profile} canEditAll={hr} canEditPersonal={isSelf} showPay={pay || isSelf} params={payroll} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">Vacaciones, permisos e incapacidades</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <AbsenceManager
                person={person}
                absences={upcoming}
                users={users}
                canEdit={isSelf || hr}
                canDecide={!isSelf && (hr || manages)}
                asRequest={isSelf && !hr}
              />
              {past.length ? (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-muted-foreground">Historial · {past.length}</summary>
                  <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                    {past.map((a) => (
                      <li key={a.id}>
                        {day(a.startOn)} → {day(a.endOn)} · {a.kind === "vacation" ? "Vacaciones" : a.kind === "sick" ? "Incapacidad" : a.kind === "leave" ? "Permiso" : "Otro"}
                        {a.note ? ` · ${a.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </CardContent>
          </Card>

          {isSelf || hr ? (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border py-3">
                <CardTitle className="text-sm">Documentos · {documents.length}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <HrDocuments userId={id} documents={documents} canUpload={isSelf || hr} canDelete={hr} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="gap-2 p-4 text-sm">
            <p className="text-muted-foreground">Vacaciones (días hábiles)</p>
            {profile.startDate ? (
              <>
                <p className="text-3xl font-semibold tabular-nums">{bal.available}</p>
                <p className="text-xs text-muted-foreground">disponibles hoy</p>
                <ul className="mt-2 flex flex-col gap-1 text-xs">
                  <li className="flex justify-between"><span className="text-muted-foreground">Acumulados</span><span className="font-mono">{bal.accrued}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Tomados</span><span className="font-mono">{bal.taken}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Programados</span><span className="font-mono">{bal.scheduled}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Por aprobar</span><span className="font-mono">{bal.pending}</span></li>
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">15 días hábiles por año trabajado (Código Sustantivo del Trabajo, art. 186).</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Falta la fecha de ingreso para calcularlas.</p>
            )}
          </Card>
          {file ? (
            <Card className="gap-1.5 p-4 text-sm">
              <p className="text-muted-foreground">Contrato</p>
              <p className="font-medium">{CONTRACT_LABEL[file.contractType]}</p>
              {file.startDate ? <p className="text-xs text-muted-foreground">Desde {day(file.startDate)}{file.endDate ? ` hasta ${day(file.endDate)}` : ""}</p> : null}
              {(pay || isSelf) && file.salary ? (
                <p className="text-xs">
                  {money(file.salary)} <span className="text-muted-foreground">{PERIOD_LABEL[file.salaryPeriod]}</span>
                </p>
              ) : null}
            </Card>
          ) : null}
          <Link href={`/work/team/${id}`} className="text-xs text-primary hover:underline">
            Ver ficha en Team (tareas, horas, organigrama)
          </Link>
        </aside>
      </div>
    </div>
  );
}
