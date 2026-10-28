import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  HeartHandshake,
  Landmark,
  Home,
  Inbox,
  Images,
  LayoutList,
  LayoutTemplate,
  Settings,
  SquareStack,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only for management roles (see seesAll). */
  managersOnly?: boolean;
  /** Only for finance + direction (see seesFinance). */
  financeOnly?: boolean;
};

export type WorkNavGroup = {
  id: string;
  label?: string;
  items: WorkNavItem[];
};

export const WORK_NAV: WorkNavGroup[] = [
  {
    id: "main",
    items: [
      { label: "Home", href: "/work/home", icon: Home },
      { label: "Inbox", href: "/work/inbox", icon: Inbox },
      { label: "Approvals", href: "/work/approvals", icon: CheckSquare },
    ],
  },
  {
    id: "work",
    label: "Trabajo",
    items: [
      { label: "Requests", href: "/work/requests", icon: LayoutList },
      { label: "Projects", href: "/work/projects", icon: FolderKanban },
      { label: "Workflow", href: "/work/workflow", icon: Workflow },
      { label: "Calendar", href: "/work/calendar", icon: CalendarDays },
      { label: "Plantillas", href: "/work/templates", icon: LayoutTemplate, managersOnly: true },
    ],
  },
  {
    id: "accounts",
    label: "Cuentas",
    items: [
      { label: "Clients", href: "/work/clients", icon: Users },
      { label: "Assets", href: "/work/assets", icon: Images },
    ],
  },
  {
    id: "people",
    label: "Personas",
    items: [
      { label: "Team", href: "/work/team", icon: SquareStack },
      { label: "Recursos humanos", href: "/work/hr", icon: HeartHandshake },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { label: "Finanzas", href: "/work/finance", icon: Landmark, financeOnly: true },
      { label: "Insights", href: "/work/insights", icon: BarChart3, managersOnly: true },
      { label: "Settings", href: "/work/settings", icon: Settings },
    ],
  },
];
