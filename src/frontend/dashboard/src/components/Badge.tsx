import type { ReactNode } from "react";

type BadgeKind = "ok" | "warn" | "bad" | "info" | "acc";

type BadgeProps = {
  kind?: BadgeKind;
  dot?: boolean;
  children: ReactNode;
  className?: string;
};

export function Badge({ kind, dot = false, children, className = "" }: BadgeProps) {
  return (
    <span className={["kf-badge", kind, className].filter(Boolean).join(" ")}>
      {dot ? <i className="dot" /> : null}
      {children}
    </span>
  );
}
