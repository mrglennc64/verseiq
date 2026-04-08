import { redirect } from "next/navigation";

export default function RoyaltyRecoveryDashboardRedirect({
  searchParams,
}: {
  searchParams?: { scanId?: string };
}) {
  const scanId = searchParams?.scanId ?? "";
  if (scanId) {
    redirect(`/verseiq/royalty-recovery/results?scanId=${encodeURIComponent(scanId)}`);
  }

  redirect("/verseiq/royalty-recovery/results");
}
