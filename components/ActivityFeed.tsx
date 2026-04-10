// Example: ActivityFeed component
import { Activity } from '../types/label.types';

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <ul className="divide-y">
      {activities.map((activity) => (
        <li key={activity.id} className="py-2">
          <div className="font-medium">{activity.type}</div>
          <div className="text-sm text-gray-500">{activity.description}</div>
          <div className="text-xs text-gray-400">{activity.timestamp.toString()}</div>
        </li>
      ))}
    </ul>
  );
}
