"use client";

import Link from "next/link";
import { markReadAction } from "@/lib/work/actions";

/** Inbox row link that marks the notification as read when opened. */
export function NotificationLink({
  id,
  read,
  href,
  className,
  children,
}: {
  id: string;
  read: boolean;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => (read ? undefined : void markReadAction(id))}>
      {children}
    </Link>
  );
}
