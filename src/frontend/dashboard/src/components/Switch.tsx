type SwitchProps = {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
  title?: string;
};

export function Switch({ checked, label, onChange, title }: SwitchProps) {
  return (
    <button
      type="button"
      className="kf-switch"
      data-on={checked}
      aria-pressed={checked}
      title={title}
      onClick={() => onChange(!checked)}
    >
      <span className="track"><i /></span>
      <span>{label}</span>
    </button>
  );
}
