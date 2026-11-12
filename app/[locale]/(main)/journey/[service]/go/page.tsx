import { notFound } from "next/navigation";
import { ServicePage } from "@/features/studio/screens/JourneyScreen";
import type { Service } from "@/features/studio/flows";

const SERVICES: Service[] = ["hairstyle", "beard", "armocromia", "colour", "makeup", "skin"];

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (!SERVICES.includes(service as Service)) notFound();
  return <ServicePage service={service as Service} />;
}
