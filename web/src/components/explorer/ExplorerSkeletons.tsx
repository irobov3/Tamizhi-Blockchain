/**
 * Reusable loading skeletons for the block explorer.
 */

export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-background-card border border-background-border animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-surface-hover mb-3" />
      <div className="h-6 w-24 rounded bg-surface-hover mb-2" />
      <div className="h-3 w-16 rounded bg-surface-hover" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-background-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-surface-hover animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 10, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-background-card border border-background-border animate-pulse space-y-3">
      <div className="h-5 w-1/3 rounded bg-surface-hover" />
      <div className="h-4 w-full rounded bg-surface-hover" />
      <div className="h-4 w-2/3 rounded bg-surface-hover" />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-surface-hover" />
      <div className="rounded-xl bg-background-card border border-background-border p-6 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-32 rounded bg-surface-hover flex-shrink-0" />
            <div className="h-4 flex-1 rounded bg-surface-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}
