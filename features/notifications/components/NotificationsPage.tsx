"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import TopRow from "@/design-system/components/common/top-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchSalonNotifications,
  markSalonNotificationRead,
  type SalonNotification,
  type NotificationPaymentData,
} from "@/features/notifications/api/notifications-api";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function PaymentDialog({
  payment,
  open,
  onClose,
}: {
  payment: NotificationPaymentData;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
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
            Payment Pending
          </DialogTitle>
          <DialogDescription className="sr-only">
            Payment notification
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 flex flex-col items-center gap-6">
          <p className="text-white/85 text-2xl md:text-3xl leading-relaxed text-center">
            Amount Due:{" "}
            <span className="font-bold text-white">
              ₹{parseFloat(payment.amount).toLocaleString()}
            </span>
          </p>

          {payment.due_date && (
            <p className="text-white/70 text-xl text-center">
              Due by:{" "}
              <span className="text-white/90 font-medium">
                {new Date(payment.due_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          )}

          {payment.message && (
            <p className="text-white/70 text-xl text-center whitespace-pre-wrap">
              {payment.message}
            </p>
          )}

          {payment.qr_code_image && (
            <div className="bg-white rounded-2xl p-4 mt-2">
              {/* Plain <img>: QR URL is admin-entered and may be on any host */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payment.qr_code_image}
                alt="Payment QR Code"
                width={280}
                height={280}
                className="w-[280px] h-[280px] object-contain"
              />
            </div>
          )}

          {payment.qr_code_image && (
            <p className="text-white/60 text-lg text-center">
              Scan the QR code above to make the payment
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="bg-white text-black font-semibold text-2xl md:text-3xl rounded-xl px-14 py-4 hover:opacity-90 transition"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificationsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [items, setItems] = useState<SalonNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] =
    useState<NotificationPaymentData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSalonNotifications();
      setItems(list);
    } catch (err) {
      console.error(err);
      setError(t("notifications.loadError"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleNotificationClick = async (n: SalonNotification) => {
    if (n.notification_type === "payment" && n.payment_data) {
      setSelectedPayment(n.payment_data);
      // Mark as read when opened
      if (!n.is_read) {
        try {
          await markSalonNotificationRead(n.id);
          setItems((prev) =>
            prev.map((item) =>
              item.id === n.id ? { ...item, is_read: true } : item
            )
          );
        } catch {
          // ignore
        }
      }
    }
  };

  return (
    <div className="min-h-full bg-black text-white px-6 pb-16">
      <TopRow
        onBack={() => router.push("/")}
        onHome={() => router.push("/")}
        title={t("notifications.title")}
      />

      <div className="mt-12 max-w-4xl mx-auto">
        {loading && (
          <p className="text-center text-3xl text-white/60 py-20">
            {t("notifications.loading")}
          </p>
        )}

        {!loading && error && (
          <div className="text-center space-y-6 py-20">
            <p className="text-3xl text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="bg-white text-black text-2xl font-semibold rounded-xl px-10 py-4"
            >
              {t("notifications.retry")}
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-center text-3xl text-white/50 py-20">
            {t("notifications.empty")}
          </p>
        )}

        {!loading && !error && items.length > 0 && (
          <ul className="flex flex-col gap-6">
            {items.map((n) => {
              const isPayment =
                n.notification_type === "payment" && n.payment_data;
              return (
                <li
                  key={n.id}
                  role={isPayment ? "button" : undefined}
                  tabIndex={isPayment ? 0 : undefined}
                  onClick={
                    isPayment
                      ? () => void handleNotificationClick(n)
                      : undefined
                  }
                  onKeyDown={
                    isPayment
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ")
                            void handleNotificationClick(n);
                        }
                      : undefined
                  }
                  className={cn(
                    "rounded-2xl border p-6 md:p-8",
                    n.is_read
                      ? "border-white/15 bg-white/5"
                      : "border-white/40 bg-white/10",
                    isPayment && "cursor-pointer hover:bg-white/15 transition-colors"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-3xl md:text-4xl font-semibold">
                      {n.title}
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                      {isPayment && (
                        <span className="text-lg uppercase tracking-wide bg-yellow-600 text-white px-3 py-1 rounded-full font-semibold">
                          Payment
                        </span>
                      )}
                      {!n.is_read && (
                        <span className="text-lg uppercase tracking-wide bg-white text-black px-3 py-1 rounded-full font-semibold">
                          {t("notifications.unread")}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-2xl text-white/80 whitespace-pre-wrap leading-relaxed">
                    {n.message}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xl text-white/40">
                      {formatDate(n.created_at)}
                    </p>
                    {isPayment && (
                      <p className="text-xl text-white/50">
                        Tap to view payment details →
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedPayment && (
        <PaymentDialog
          payment={selectedPayment}
          open={true}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
}
