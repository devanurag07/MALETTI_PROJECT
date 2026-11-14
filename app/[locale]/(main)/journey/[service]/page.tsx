import { notFound } from "next/navigation";
import { ServiceIntro } from "@/features/studio/screens/JourneyScreen";
import type { Service } from "@/features/studio/flows";

const SERVICES: Service[] = ["hairstyle", "beard", "armocromia", "colour", "makeup", "skin"];

/** Pre-rendered at build time (fast navigation); other values 404. */
export const generateStaticParams = () => SERVICES.map((service) => ({ service }));
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (!SERVICES.includes(service as Service)) notFound();
  return <ServiceIntro service={service as Service} />;
}
