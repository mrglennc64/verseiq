// Example: CatalogTable component
import { CatalogItem } from '../types/label.types';

interface CatalogTableProps {
  items: CatalogItem[];
}

export function CatalogTable({ items }: CatalogTableProps) {
  return (
    <table className="min-w-full border">
      <thead>
        <tr>
          <th className="border px-2 py-1">Title</th>
          <th className="border px-2 py-1">Artist</th>
          <th className="border px-2 py-1">Streams</th>
          <th className="border px-2 py-1">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td className="border px-2 py-1">{item.title}</td>
            <td className="border px-2 py-1">{item.artist}</td>
            <td className="border px-2 py-1">{item.streams}</td>
            <td className="border px-2 py-1">{item.revenue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
