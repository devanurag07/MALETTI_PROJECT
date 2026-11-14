"use client";

import { useState } from "react";
import { GeneratingScan, markGenStart } from "@/features/studio/components/GeneratingScan";
import { useStudio } from "@/features/studio/context/StudioContext";
import { Screen } from "@/features/studio/ui";

/**
 * Shown the instant "Try this look" is tapped: the try-on's generating animation on the customer's photo, instead of
 * a spinner inside the button while the server renders /try. The page then continues the same animation.
 */
export default function Loading() {
  const { photo } = useStudio();
  useState(markGenStart);
  return (
    <Screen animKey="try-loading" onBack={false}>
      <GeneratingScan image={photo} preview />
    </Screen>
  );
}
