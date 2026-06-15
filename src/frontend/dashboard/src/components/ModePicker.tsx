import type { AutomationMode } from "../data/automationSample";

const OPTIONS: Array<{ value: AutomationMode; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "ask", label: "Ask me" },
  { value: "never", label: "Never" },
];

type ModePickerProps = {
  value: AutomationMode;
  onChange: (mode: AutomationMode) => void;
  label: string;
};

export function ModePicker({ value, onChange, label }: ModePickerProps) {
  return (
    <div className="kf-seg" role="radiogroup" aria-label={label}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? `on ${option.value}` : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
