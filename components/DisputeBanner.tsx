// Example: DisputeBanner component
import { Dispute } from '../types/types';

interface DisputeBannerProps {
  dispute: Dispute;
}

export function DisputeBanner({ dispute }: DisputeBannerProps) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative">
      <strong className="font-bold">Dispute:</strong> {dispute.id} - {dispute.status}
    </div>
  );
}
