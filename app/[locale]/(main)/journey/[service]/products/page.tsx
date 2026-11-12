import { notFound } from "next/navigation";
import { SkinProductsPage } from "@/features/studio/screens/JourneyScreen";

/** Only the skin service has a products page: /journey/skin/products (after the skin map). */
export default async function Page({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  if (service !== "skin") notFound();
  return <SkinProductsPage />;
}
