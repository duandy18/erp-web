import "../admin-apps/adminApps.css";
import { SystemAppsListPanel } from "../components/SystemAppsListPanel";

export function SystemAppsListPage() {
  return (
    <div className="page-stack">
      <SystemAppsListPanel />
    </div>
  );
}
