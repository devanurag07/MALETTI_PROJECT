"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ServiceScan } from "@/features/studio/screens/JourneyScreen";
import { LoadingStage } from "@/features/studio/ui";
import type { Service } from "@/features/studio/flows";

/**
 * Shown the instant a service page is opened: the service's own scan animation where the page has one (Armocromia,
 * skin, and every Simple Service page), instead of a spinner while the server renders it. The page then takes over.
 * Consultation haircut / beard / colour / make-up pages open straight on their recommendations: no scan.
 */
export default function Loading() {
  const { service } = useParams<{ service: string }>();
  const simple = useSearchParams().get("simple") === "1";
  if (!simple && service !== "armocromia" && service !== "skin") return <LoadingStage />;
  return <ServiceScan service={service as Service} />;
}
