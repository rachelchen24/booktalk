/** How far through a book the reader is. A track with no fill means not started. */
export function ProgressBar({ percent, label, className = "" }: {
  percent: number | null;
  label: string;
  className?: string;
}) {
  const value = Math.min(100, Math.max(0, percent ?? 0));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={`h-1.5 overflow-hidden rounded-full bg-border/70 ${className}`}
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${value}%` }} />
    </div>
  );
}
