// Example: SettlementList component
import { Settlement } from '../types/label.types';

interface SettlementListProps {
  settlements: Settlement[];
}

export function SettlementList({ settlements }: SettlementListProps) {
  return (
    <div>
      <h4 className="font-semibold mb-2">Settlements</h4>
      <ul>
        {settlements.map((settlement) => (
          <li key={settlement.id} className="mb-2">
            <div>Track: {settlement.trackId}</div>
            <div>Amount: {settlement.amount}</div>
            <div>Status: {settlement.status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
