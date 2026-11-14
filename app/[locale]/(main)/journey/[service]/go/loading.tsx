"use client";

import { useParams } from "next/navigation";
import { ServiceScan } from "@/features/studio/screens/JourneyScreen";
import type { Service } from "@/features/studio/flows";

/**
 * Shown the instant Proceed is tapped on a service intro: the service's own scan animation (Armocromia, skin, …),
 * instead of a spinner in the button while the server renders the page. The page then takes over with the same scan.
 */
export default function Loading() {
  const { service } = useParams<{ service: string }>();
  return <ServiceScan service={service as Service} />;
}
