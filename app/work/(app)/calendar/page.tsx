import type { Metadata } from "next";
import { getCalendar, getClients } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { MonthCalendar } from "@/components/work/calendar/month-calendar";
import { NewEventButton } from "@/components/work/calendar/new-event";
import { supabaseConfigured } from "@/lib/work/supabase/env";

export const metadata: Metadata = { title: "Calendar · OR-K WORK" };

export default async function CalendarPage() {
  const [events, clients] = await Promise.all([getCalendar(), getClients()]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Calendario"
        description="Deadlines, entregas, publicaciones y reuniones."
        actions={supabaseConfigured ? <NewEventButton clients={clients} /> : null}
      />
      <MonthCalendar events={events} clients={clients} />
    </div>
  );
}
