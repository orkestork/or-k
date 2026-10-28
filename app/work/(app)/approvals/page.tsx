import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import {
  getClients,
  getRequests,
  getSessionUser,
  getUsers,
} from "@/lib/work/data";
import { mustApprove } from "@/lib/work/people";
import { PageHeader } from "@/components/work/shared/page-header";
import { EmptyState } from "@/components/work/shared/empty-state";
import { RequestList } from "@/components/work/requests/request-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/work/ui/card";

export const metadata: Metadata = { title: "Approvals · OR-K WORK" };

const REVIEW = ["copy_review", "creative_review", "account_review", "client_review"] as const;

export default async function ApprovalsPage() {
  const [requests, clients, users, me] = await Promise.all([
    getRequests(),
    getClients(),
    getUsers(),
    getSessionUser(),
  ]);

  const inReview = requests.filter((r) =>
    (REVIEW as readonly string[]).includes(r.state),
  );
  const subOf = (id: string) => users.find((u) => u.id === id)?.away?.substituteId;
  const forMe = inReview.filter((r) => mustApprove(r, me, subOf));
  const others = inReview.filter((r) => !mustApprove(r, me, subOf));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Aprobaciones"
        description="Piezas esperando una decisión en alguna etapa de revisión."
      />

      {inReview.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nada en revisión ahora mismo" />
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">
                Para ti · {forMe.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {forMe.length ? (
                <RequestList requests={forMe} clients={clients} users={users} />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Nada requiere tu aprobación.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-border py-3">
              <CardTitle className="text-sm">
                En otras revisiones · {others.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RequestList requests={others} clients={clients} users={users} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
