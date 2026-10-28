import type { Client, WorkUserRecord } from "@/types/work/domain";
import type { FilterOption } from "./search-filter";

export const clientOptions = (clients: Client[]): FilterOption[] =>
  clients.map((c) => ({ value: c.id, label: c.name, color: c.accentColor, badge: c.logoText }));

export const peopleOptions = (users: WorkUserRecord[]): FilterOption[] =>
  users
    .filter((u) => u.active && u.role !== "client")
    .map((u) => ({ value: u.id, label: u.name, color: u.color, badge: u.initials, image: u.avatarUrl }));
