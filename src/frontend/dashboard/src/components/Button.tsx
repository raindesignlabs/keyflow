import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export function Button({ variant = "ghost", size = "md", children, className = "", ...props }: ButtonProps) {
  return (
    <button className={["kf-btn", variant, size !== "md" ? size : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  );
}
