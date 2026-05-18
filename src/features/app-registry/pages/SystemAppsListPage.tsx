import "../admin-apps/adminApps.css";
import { SystemAppsListPanel } from "../components/SystemAppsListPanel";

export function SystemAppsListPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">Independent Systems</div>
        <h2>独立系统列表</h2>
        <p>管理独立系统入口、API 路径、本地端口合同、启停状态和自描述同步。</p>
      </section>

      <SystemAppsListPanel />
    </div>
  );
}
