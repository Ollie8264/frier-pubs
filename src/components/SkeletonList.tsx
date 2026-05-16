/**
 * Ghost pub-card skeletons for the loading state.
 * Shows a few faded placeholders so the layout doesn't shift when data lands.
 */

export default function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading pubs">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div
              className="h-4 bg-[var(--bg-tint)] rounded-md"
              style={{ width: `${50 + (i % 3) * 15}%` }}
            />
            <div className="h-4 w-10 bg-[var(--gold-bg)] rounded-md shrink-0" />
          </div>
          <div className="h-3 w-3/4 bg-[var(--bg-tint)] rounded-md mb-3" />
          <div className="flex gap-1">
            <div className="h-4 w-12 bg-[var(--color-food-bg)] rounded-md" />
            <div className="h-4 w-14 bg-[var(--color-garden-bg)] rounded-md" />
            {i % 2 === 0 && (
              <div className="h-4 w-10 bg-[var(--color-ale-bg)] rounded-md" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
