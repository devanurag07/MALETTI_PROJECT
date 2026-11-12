"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import UnreadNotificationPopup from "@/features/notifications/components/UnreadNotificationPopup";

/**
 * Homepage bell with red unread badge + unread popup dialogs.
 */
export default function NotificationsBell() {
  const t = useTranslations();
  // Kept in sync (and polled) by UnreadNotificationPopup
  const [unreadCount, setUnreadCount] = useState(0);

  const badgeLabel =
    unreadCount > 99 ? "99+" : String(Math.max(0, unreadCount));

  return (
    <>
      <Link
        href="/notifications"
        className="relative p-4 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/10 transition-colors"
        aria-label={
          unreadCount > 0
            ? `${t("notifications.title")} (${unreadCount} ${t("notifications.unread")})`
            : t("notifications.title")
        }
      >
        <Bell size={72} color="white" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[2.25rem] h-9 px-2.5 rounded-full bg-red-600 text-white text-xl font-bold flex items-center justify-center leading-none shadow-md ring-2 ring-black"
            aria-hidden
          >
            {badgeLabel}
          </span>
        )}
      </Link>
      <UnreadNotificationPopup onUnreadCountChange={setUnreadCount} />
    </>
  );
}
