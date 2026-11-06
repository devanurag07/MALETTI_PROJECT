import { Suspense } from "react";
import ReportScreen from "@/features/studio/screens/ReportScreen";

export default function Page() {
  return (
    <Suspense>
      <ReportScreen />
    </Suspense>
  );
}
