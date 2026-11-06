import { StudioTheme } from "@/features/studio/theme";
import ReportPrint from "@/features/studio/report/ReportPrint";

/** Print layout the PDF route renders (Puppeteer). Outside (main): no kiosk login, the share token is the credential. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <StudioTheme>
      <ReportPrint token={token} />
    </StudioTheme>
  );
}
