type ProgressProps = {
  value: number;
  max?: number;
  ok?: boolean;
  large?: boolean;
};

export function Progress({ value, max = 100, ok = false, large = false }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`kf-track${large ? " lg" : ""}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <i className={ok ? "ok" : undefined} style={{ width: `${pct}%` }} />
    </div>
  );
}
