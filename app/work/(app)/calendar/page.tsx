import type { Metadata } from "next";
import { getCalendar, getClients } from "@/lib/work/data";
import { PageHeader } from "@/components/work/shared/page-header";
import { MonthCalendar } from "@/components/work/calendar/month-calendar";
import { NewEventButton } from "@/components/work/calendar/new-event";
import { supabaseConfigured } from "@/lib/work/supabase/env";
import { SearchFilter } from "@/components/work/shared/search-filter";
import { clientOptions } from "@/components/work/shared/filter-options";

export const metadata: Metadata = { title: "Calendar · OR-K WORK" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const [all, clients] = await Promise.all([getCalendar(), getClients()]);
  const events = sp.client ? all.filter((e) => e.clientId === sp.client) : all;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Calendario"
        description="Deadlines, entregas, publicaciones y reuniones."
        actions={supabaseConfigured ? <NewEventButton clients={clients} /> : null}
      >
        <SearchFilter
          param="client"
          label="Cliente"
          allLabel="Todos"
          placeholder="Buscar cliente…"
          options={clientOptions(clients)}
        />
      </PageHeader>
      <MonthCalendar events={events} clients={clients} />
    </div>
  );
}
