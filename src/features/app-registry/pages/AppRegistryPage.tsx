import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import { AppCard } from "../components/AppCard";
import { useRegisteredApps } from "../hooks/useRegisteredApps";

export function AppRegistryPage() {
  const { token } = useSessionRuntime();
  const { apps, loading, error } = useRegisteredApps(token);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">App Registry</div>
        <h2>应用中心</h2>
        <p>应用入口、API 路径和本地端口合同由 ERP 后端 App Registry 统一登记。</p>
      </section>

      {error ? <div className="admin-users-alert danger">{error}</div> : null}
      {loading ? <div className="admin-users-alert">正在加载应用注册信息…</div> : null}

      <section className="grid app-grid">
        {apps.map((app) => (
          <AppCard key={app.code} app={app} />
        ))}
      </section>
    </div>
  );
}
