import { useState } from "react";
import { Shell, type RouteKey } from "./components/Shell";
import { AutomationPage } from "./routes/AutomationPage";
import { PilotPage } from "./routes/PilotPage";

const ROUTES: RouteKey[] = ["home", "pilot", "automation", "activity", "approvals", "leads", "knowledge", "reports", "settings"];

function routeTitle(route: RouteKey) {
  return route[0].toUpperCase() + route.slice(1);
}

function initialRoute(): RouteKey {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("route");
  const fromHash = window.location.hash.replace(/^#/, "");
  const candidate = fromQuery || fromHash;
  return ROUTES.includes(candidate as RouteKey) ? candidate as RouteKey : "pilot";
}

export function App() {
  const [route, setRouteState] = useState<RouteKey>(initialRoute);

  function setRoute(next: RouteKey) {
    setRouteState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("route", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <Shell activeRoute={route} onRouteChange={setRoute}>
      {route === "pilot" ? (
        <PilotPage goAutomation={() => setRoute("automation")} />
      ) : route === "automation" ? (
        <AutomationPage />
      ) : (
        <section className="kf-placeholder">
          <div className="kf-row" style={{ gap: 10, marginBottom: 8 }}>
            <span className="kf-eyebrow">{route}</span>
            <span className="kf-badge acc">Coming next</span>
          </div>
          <h1 className="kf-h1">{routeTitle(route)}</h1>
          <p className="kf-body kf-placeholder-copy">
            This section is intentionally stubbed while KeyFlow v1.2 focuses on the Pilot and Automation control-center experience first.
          </p>
        </section>
      )}
    </Shell>
  );
}
