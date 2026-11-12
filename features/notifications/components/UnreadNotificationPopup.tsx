"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import {
  fetchSalonNotifications,
  markSalonNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  type SalonNotification,
} from "@/features/notifications/api/notifications-api";
import { usePolling } from "@/hooks/usePolling";
import {
  acquirePopup,
  onPopupReleased,
  releasePopup,
} from "@/features/notifications/popup-lock";

const POLL_INTERVAL_MS = 60_000;

type UnreadNotificationPopupProps = {
  /** Called whenever the unread list is refreshed (for badge sync). */
  onUnreadCountChange?: (count: number) => void;
};

/**
 * Shows the newest unread salon notification as a modal on the homepage.
 * Closing marks it read; if more unread remain, the next one is shown.
 */
export default function UnreadNotificationPopup({
  onUnreadCountChange,
}: UnreadNotificationPopupProps) {
  const t = useTranslations();
  const [current, setCurrent] = useState<SalonNotification | null>(null);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  // Ref so polling can tell if a dialog is showing without re-creating loadUnread
  const busyRef = useRef(false);
  busyRef.current = open || closing;
  const mountedRef = useRef(false);
  // Only the latest request may act — drops stale/out-of-order responses
  const requestIdRef = useRef(0);

  const loadUnread = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const unread = await fetchSalonNotifications({ unreadOnly: true });
      // Unmounted or superseded: must not take the lock or set a stale badge
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      onUnreadCountChange?.(unread.length);
      // Don't swap content under an open dialog; just keep the badge in sync
      if (busyRef.current) return;
      // Skip payment-type notifications — PaymentPopup handles those
      const general = unread.filter((n) => n.notification_type !== "payment");
      const next = general[0] ?? null;
      // Wait our turn if the payment popup is showing
      if (!next || !acquirePopup("notification")) return;
      setCurrent(next);
      setOpen(true);
    } catch (err) {
      console.error("Failed to load unread notifications:", err);
    }
  }, [onUnreadCountChange]);

  usePolling(() => void loadUnread(), POLL_INTERVAL_MS);

  useEffect(() => {
    const onChanged = () => void loadUnread();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
    return () =>
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged);
  }, [loadUnread]);

  useEffect(
    () => onPopupReleased("notification", () => void loadUnread()),
    [loadUnread]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Free the lock if we navigate away while open
      releasePopup("notification");
    };
  }, []);

  const handleClose = async () => {
    if (!current || closing) return;
    // Discard loads started before mark-read — they still list this one as unread
    requestIdRef.current++;
    setClosing(true);
    const id = current.id;
    setOpen(false);
    setCurrent(null);
    try {
      await markSalonNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    } finally {
      setClosing(false);
      busyRef.current = false;
      // Release only after mark-read so the same notification isn't re-shown;
      // the payment popup (if waiting) and our next unread then race for the lock
      releasePopup("notification");
      void loadUnread();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void handleClose();
        else setOpen(true);
      }}
    >
      <DialogContent
        className="bg-[#111] border border-white/20 text-white max-w-2xl w-[90vw] rounded-2xl p-8 sm:p-10"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-4xl font-bold text-white text-center">
            {current?.title ?? t("notifications.popupTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("notifications.popupTitle")}
          </DialogDescription>
        </DialogHeader>

        <p className="mt-6 text-white/85 text-2xl md:text-3xl leading-relaxed text-center whitespace-pre-wrap">
          {current?.message}
        </p>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            disabled={closing}
            onClick={() => void handleClose()}
            className="bg-white text-black font-semibold text-2xl md:text-3xl rounded-xl px-14 py-4 hover:opacity-90 transition disabled:opacity-60"
          >
            {t("notifications.close")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
