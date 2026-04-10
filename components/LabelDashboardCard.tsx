// Example: LabelDashboardCard component
import { LabelDashboard } from '../types/label.types';

interface LabelDashboardCardProps {
  dashboard: LabelDashboard;
}

export function LabelDashboardCard({ dashboard }: LabelDashboardCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow">
      <h2 className="text-xl font-bold mb-2">{dashboard.name}</h2>
      <div className="text-sm text-gray-600">Total Value: {dashboard.metrics.totalCatalogValue} {dashboard.metrics.currency}</div>
      <div className="text-sm text-gray-600">Monthly Royalties: {dashboard.metrics.monthlyRoyalties}</div>
      {/* ...more metrics... */}
    </div>
  );
}
