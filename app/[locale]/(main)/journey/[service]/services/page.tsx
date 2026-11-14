import { notFound } from "next/navigation";
import { SkinServicesPage } from "@/features/studio/screens/JourneyScreen";

/** Only the skin service has a services page: /journey/skin/services (after the skin products). */
/** Only skin has this page; pre-rendered at build time (fast navigation). */
export const generateStaticParams = () => [{ service: "skin" }];
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (service !== "skin") notFound();
  return <SkinServicesPage />;
}
