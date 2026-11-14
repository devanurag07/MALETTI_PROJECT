import { Suspense } from "react";
import MirrorFrame from "@/design-system/components/common/mirror-frame";
import { StudioProvider } from "@/features/studio/context/StudioContext";
import { StudioTheme } from "@/features/studio/theme";

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Theme first, so the salon login / screensaver inside MirrorFrame share the client look.
    <StudioTheme>
      <MirrorFrame>
        {/* Inside MirrorFrame so the Studio config loads only after the salon login. */}
        {/* Suspense: screens read the query string (useSearchParams), which static pages require a boundary for. */}
        <StudioProvider><Suspense fallback={null}>{children}</Suspense></StudioProvider>
      </MirrorFrame>
    </StudioTheme>
  );
}
