import { Suspense } from "react";
import { notFound } from "next/navigation";
import TryScreen from "@/features/studio/screens/TryScreen";

const KINDS = ["cut", "colour", "makeup", "beard"] as const;

/** Pre-rendered at build time (fast navigation); other values 404. */
export const generateStaticParams = () => KINDS.map((kind) => ({ kind }));
export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind as (typeof KINDS)[number])) notFound();
  return (
    <Suspense>
      <TryScreen kind={kind as (typeof KINDS)[number]} />
    </Suspense>
  );
}
