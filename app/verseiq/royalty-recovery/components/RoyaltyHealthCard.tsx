type RoyaltyHealthProps = {
  score: number;
};

export function RoyaltyHealthCard({ score }: RoyaltyHealthProps) {
  const label = score >= 85 ? "Strong" : score >= 60 ? "At Risk" : "Critical";
  const color =
    score >= 85 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-2">Royalty Health Score</h3>
      <p className={`text-4xl font-bold ${color}`}>{score}</p>
      <p className={`mt-1 text-sm ${color}`}>{label}</p>
      <p className="text-gray-500 mt-3 text-xs">
        Metadata integrity score based on ISRC completeness, duplicate titles, and release date coverage.
      </p>
    </div>
  );
}
