import PublicLookScreen from "@/features/studio/screens/PublicLookScreen";
import { StudioTheme } from "@/features/studio/theme";

/** Outside (main): no MirrorFrame / kiosk login — opened on the customer's phone from the QR or e-mail. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <StudioTheme>
      <PublicLookScreen token={token} />
    </StudioTheme>
  );
}
