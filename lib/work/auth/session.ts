import { getMe } from "@/lib/work/data";
import type { RoleSlug } from "@/types/work/domain";

export type WorkUser = {
  id: string;
  email: string;
  name: string;
  role: RoleSlug;
  title: string;
  initials: string;
  color: string;
  active: boolean;
  avatarUrl?: string | null;
};

/**
 * Returns the current OR-K WORK user from their profile.
 * While Supabase is not provisioned this resolves to the mock session user so
 * the whole app behaves "as if" someone is signed in.
 */
export async function getCurrentUser(): Promise<WorkUser | null> {
  const me = await getMe();
  if (!me) return null;
  return {
    id: me.id,
    email: me.email,
    name: me.name,
    role: me.role,
    title: me.title,
    initials: me.initials,
    color: me.color,
    active: me.active,
    avatarUrl: me.avatarUrl,
  };
}
