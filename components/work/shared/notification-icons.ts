import { AtSign, Bell, CalendarClock, CheckCircle2, RotateCcw, UserPlus } from "lucide-react";

export const NOTIFICATION_ICON = {
  assignment: UserPlus,
  mention: AtSign,
  approval: CheckCircle2,
  adjustment: RotateCcw,
  deadline: CalendarClock,
  status: Bell,
} as const;
