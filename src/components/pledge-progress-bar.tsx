interface PledgeProgressBarProps {
  ratio: number;
  label: string;
}

export function PledgeProgressBar({ ratio, label }: PledgeProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);

  return (
    <div className="mt-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
