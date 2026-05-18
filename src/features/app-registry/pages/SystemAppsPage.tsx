import "../admin-apps/adminApps.css";
import { SystemAppsFrontendPagesPanel } from "../components/SystemAppsFrontendPagesPanel";
import { SystemAppsListPanel } from "../components/SystemAppsListPanel";
import { SystemAppsTabs } from "../components/SystemAppsTabs";

export type SystemAppsPageView = "independent-systems" | "frontend-pages";

type SystemAppsPageProps = {
  activeView: SystemAppsPageView;
};

export function SystemAppsPage({ activeView }: SystemAppsPageProps) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">Independent Systems</div>
        <h2>独立系统注册</h2>
        <p>管理独立系统入口，并展示各系统同步到 ERP 的前端页面目录。</p>
      </section>

      <SystemAppsTabs />

      {activeView === "independent-systems" ? (
        <SystemAppsListPanel />
      ) : (
        <SystemAppsFrontendPagesPanel />
      )}
    </div>
  );
}
