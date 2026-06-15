import type { ReactNode } from "react";

type SectionProps = {
  number?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function Section({ number, title, subtitle, right, children }: SectionProps) {
  return (
    <section className="kf-section">
      <div className="kf-between kf-section-head">
        <div className="kf-row kf-section-title-row">
          {number ? <span className="kf-section-num kf-num">{number}</span> : null}
          <h2 className="kf-h2">{title}</h2>
          {subtitle ? <span className="kf-sm kf-section-subtitle">{subtitle}</span> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
