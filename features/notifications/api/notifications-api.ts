import axiosClient from "@/core/network/axios-client";
import {
  SALON_NOTIFICATIONS_URL,
  salonNotificationMarkReadUrl,
} from "@/core/constants/url-constants";

export type NotificationPaymentData = {
  id: number;
  amount: string;
  qr_code_image: string;
  message: string;
  is_paid: boolean;
  due_date: string | null;
};

export type SalonNotification = {
  id: number;
  title: string;
  message: string;
  notification_type: "general" | "payment";
  payment_data: NotificationPaymentData | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

function unwrapList(payload: unknown): SalonNotification[] {
  if (Array.isArray(payload)) return payload as SalonNotification[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: SalonNotification[] }).results;
  }
  return [];
}

export async function fetchSalonNotifications(opts?: {
  unreadOnly?: boolean;
}): Promise<SalonNotification[]> {
  const params = opts?.unreadOnly ? { unread: "true" } : undefined;
  const res = await axiosClient.get(SALON_NOTIFICATIONS_URL, { params });
  return unwrapList(res.data?.data ?? res.data);
}

export async function markSalonNotificationRead(
  id: number
): Promise<SalonNotification | null> {
  const res = await axiosClient.post(salonNotificationMarkReadUrl(id));
  const data = res.data?.data ?? res.data;
  return data && typeof data === "object" ? (data as SalonNotification) : null;
}

/** Fired after notifications are marked read elsewhere, so badges/popups can refresh. */
export const NOTIFICATIONS_CHANGED_EVENT = "salon-notifications-changed";

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
