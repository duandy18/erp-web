import { AppCard } from "../../app-registry/components/AppCard";
import { useRegisteredApps } from "../../app-registry/hooks/useRegisteredApps";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";

export function MyAppsPage() {
  const { token } = useSessionRuntime();
  const { apps, loading, error } = useRegisteredApps(token);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">My Apps</div>
        <h2>我的应用</h2>
        <p>从 ERP 统一入口进入各独立业务系统。ERP 管入口和配置，各系统继续独立执行业务。</p>
      </section>

      {error ? <div className="admin-users-alert danger">{error}</div> : null}
      {loading ? <div className="admin-users-alert">正在加载我的应用…</div> : null}

      <section className="grid app-grid">
        {apps.map((app) => (
          <AppCard key={app.code} app={app} />
        ))}
      </section>
    </div>
  );
}
