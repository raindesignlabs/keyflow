import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { api, type MeResponse } from "../lib/api";

export type RouteKey = "home" | "pilot" | "automation" | "activity" | "approvals" | "leads" | "knowledge" | "reports" | "settings";

type NavItem = {
  key: RouteKey;
  label: string;
  icon: IconName;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "pilot", label: "Pilot", icon: "pilot" },
  { key: "automation", label: "Automation", icon: "tune" },
  { key: "activity", label: "Activity", icon: "activity" },
  { key: "approvals", label: "Approvals", icon: "approvals", badge: "2" },
  { key: "leads", label: "Leads", icon: "leads" },
  { key: "knowledge", label: "Knowledge", icon: "knowledge" },
  { key: "reports", label: "Reports", icon: "reports" },
];

type ShellProps = {
  activeRoute: RouteKey;
  onRouteChange: (route: RouteKey) => void;
  children: ReactNode;
};

export function Shell({ activeRoute, onRouteChange, children }: ShellProps) {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const initials = me?.display_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "DR";
  const workspaceName = me?.display_name?.split(" — ")[1] || "Pilot workspace";

  return (
    <div className="kf kf-app-shell">
      <aside className="kf-sidebar" aria-label="Main navigation">
        <div className="kf-row kf-brand-row">
          <div className="kf-brand-mark" aria-hidden="true">
            <Icon name="bolt" size={15} />
          </div>
          <div className="kf-logo"><span className="k">Key</span><span className="f">Flow</span></div>
        </div>

        <button className="kf-panel kf-workspace" type="button" aria-label="Current workspace">
          <span className="kf-av gray">{initials}</span>
          <span className="kf-grow kf-workspace-copy">
            <strong>{workspaceName}</strong>
            <span>{me?.role === "admin" ? "Admin access" : "Client access"}</span>
          </span>
          <Icon name="chevD" size={14} />
        </button>

        <nav className="kf-col kf-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`kf-nav-item${item.key === activeRoute ? " active" : ""}`}
              aria-current={item.key === activeRoute ? "page" : undefined}
              onClick={() => onRouteChange(item.key)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.badge ? <span className="kf-badge warn kf-nav-badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        <div className="kf-sidebar-spacer" />
        <button type="button" onClick={() => onRouteChange("settings")} className={`kf-nav-item${activeRoute === "settings" ? " active" : ""}`}>
          <Icon name="settings" />
          <span>Settings</span>
        </button>
      </aside>

      <main className="kf-main-shell">{children}</main>
    </div>
  );
}
