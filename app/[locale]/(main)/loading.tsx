import { LoadingStage } from "@/features/studio/ui";

/**
 * Instant feedback on every forward tap. Routes are server-rendered (dynamic), and a dynamic route without a loading
 * boundary can't be prefetched — so Proceed / Next kept spinning until the server answered. With this file the next
 * screen's shell is prefetched and shown the moment the button is tapped.
 */
export default function Loading() {
  return <LoadingStage />;
}
