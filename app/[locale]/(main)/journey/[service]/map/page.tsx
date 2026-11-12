import { notFound } from "next/navigation";
import { SkinMapPage } from "@/features/studio/screens/JourneyScreen";

/** Only the skin service has a map page: /journey/skin/map */
export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (service !== "skin") notFound();
  return <SkinMapPage />;
}
