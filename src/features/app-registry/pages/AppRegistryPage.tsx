import { AppCard } from "../components/AppCard";
import { registeredApps } from "../data/registeredApps";

export function AppRegistryPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">App Registry</div>
        <h2>应用中心</h2>
        <p>第一阶段只登记系统入口、API 路径和本地端口合同，不搬迁各系统业务页面。</p>
      </section>

      <section className="grid app-grid">
        {registeredApps.map((app) => (
          <AppCard key={app.code} app={app} />
        ))}
      </section>
    </div>
  );
}
