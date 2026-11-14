import { notFound } from "next/navigation";
import ResultsScreen from "@/features/studio/screens/ResultsScreen";

const TABS = ["skin", "face", "styles", "colour"] as const;

/** Pre-rendered at build time (fast navigation); other values 404. */
export const generateStaticParams = () => TABS.map((tab) => ({ tab }));
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!TABS.includes(tab as (typeof TABS)[number])) notFound();
  return <ResultsScreen tab={tab as (typeof TABS)[number]} />;
}
