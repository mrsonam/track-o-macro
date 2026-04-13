import { permanentRedirect } from "next/navigation";

export default function LegacyHistoryInsightsRedirect() {
  permanentRedirect("/trends");
}
