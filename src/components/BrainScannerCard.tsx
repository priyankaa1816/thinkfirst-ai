type Props = {
  insights: string[];
};

export default function BrainScannerCard({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="mt-6 p-4 rounded-xl border border-purple-500 bg-purple-50">
      <h2 className="text-lg font-semibold mb-3">
        Brain Pattern Scanner
      </h2>

      <ul className="space-y-2">
        {insights.map((i, idx) => (
          <li key={idx} className="text-sm">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
