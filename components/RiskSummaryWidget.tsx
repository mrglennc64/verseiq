// Example: RiskSummaryWidget component
import { RiskSummary } from '../types/label.types';

interface RiskSummaryWidgetProps {
  riskSummary: RiskSummary;
}

export function RiskSummaryWidget({ riskSummary }: RiskSummaryWidgetProps) {
  return (
    <div className="rounded border p-4">
      <h3 className="font-semibold mb-2">Risk Summary</h3>
      <div>High Risk: {riskSummary.highRiskItems}</div>
      <div>Medium Risk: {riskSummary.mediumRiskItems}</div>
      <div>Low Risk: {riskSummary.lowRiskItems}</div>
      <div>Total At Risk: {riskSummary.totalAtRisk}</div>
    </div>
  );
}
