export type IconName =
  | "home"
  | "pilot"
  | "tune"
  | "activity"
  | "approvals"
  | "leads"
  | "knowledge"
  | "reports"
  | "settings"
  | "bolt"
  | "chevD"
  | "arrowR"
  | "phone"
  | "clock"
  | "doc"
  | "check"
  | "target"
  | "bot"
  | "calendar"
  | "trend"
  | "plus";

const PATHS: Record<IconName, string> = {
  home: "M3 10.4 12 3l9 7.4M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  pilot: "M12 2v4M12 2 8.5 6.5h7L12 2ZM5 22l1.6-7M19 22l-1.6-7M6.6 15h10.8l-1.1-5a4.5 4.5 0 0 0-8.6 0l-1.1 5Z",
  tune: "M6 4v4M6 12v8M12 4v9M12 17v3M18 4v2M18 10v10M3 10h6M9 17h6M15 8h6",
  activity: "M3 12h4l2.5 7 5-16L17 12h4",
  approvals: "M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z",
  leads: "M16 19c0-2.8-2.2-5-5-5s-5 2.2-5 5M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 18c0-2-1-3.6-2.7-4.3M16.5 4.2A3.2 3.2 0 0 1 17 10.4",
  knowledge: "M5 4h11a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H5V4ZM5 4a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 5 20",
  reports: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19.4 13.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.5H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1A2 2 0 1 1 7.3 4l.1.1A1.6 1.6 0 0 0 9 4.6h.1A1.6 1.6 0 0 0 10 3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1A2 2 0 1 1 19.6 7l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.7Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  chevD: "M6 9l6 6 6-6",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  phone: "M16.5 13.8c-.3-.2-1.9-1-2.2-1.1-.3-.1-.5-.1-.7.1-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.2-.7-1.7-1-2.3-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.3 3.1c.2.2 2.2 3.3 5.3 4.6 2 .8 2.7.9 3.7.8.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  doc: "M14 3v5h5M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5ZM9 13h6M9 17h6",
  check: "M5 12l4.5 4.5L19 7",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  bot: "M9 13h.01M15 13h.01M9 17h6M12 3v3M7 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2ZM4 11v3M20 11v3",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  trend: "M3 17l6-6 4 4 8-8M21 7v5M21 7h-5",
  plus: "M12 5v14M5 12h14",
};

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
};

export function Icon({ name, size = 18, className, title }: IconProps) {
  const paths = PATHS[name].split("M").filter(Boolean);
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((segment, index) => (
        <path key={index} d={`M${segment}`} />
      ))}
    </svg>
  );
}
