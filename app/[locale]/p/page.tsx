import { Suspense } from "react";
import PhotoDownload from "@/features/studio/screens/PhotoDownload";
import { StudioTheme } from "@/features/studio/theme";

/** Outside (main): opened on the customer's phone from a photo's QR code — no kiosk login. */
export default function Page() {
  return (
    <StudioTheme>
      <Suspense>
        <PhotoDownload />
      </Suspense>
    </StudioTheme>
  );
}
