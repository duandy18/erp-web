import { Link } from "react-router-dom";

import { AppCard } from "../../app-registry/components/AppCard";
import { useRegisteredApps } from "../../app-registry/hooks/useRegisteredApps";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";

export function PortalHomePage() {
  const { token } = useSessionRuntime();
  const { apps, loading, error } = useRegisteredApps(token);

  return (
    <div className="page-stack">
      <section className="hero">
        <div>
          <div className="eyebrow">Portal · IAM · App Registry · Gateway</div>
          <h2>ERP 是控制面，不是新的业务大单体</h2>
          <p>
            当前阶段先建立统一入口和应用注册雏形。业务事实仍归各独立系统拥有，
            ERP 只负责入口、身份、授权、流程追踪、异常、审计和驾驶舱。
          </p>
        </div>
        <Link className="button" to="/apps">
          查看应用中心
        </Link>
      </section>

      <section className="grid two-columns">
        <div className="card">
          <div className="eyebrow">API</div>
          <h3>ERP API</h3>
          <p>本地端口：7990</p>
          <p>健康检查：/healthz /health/db</p>
        </div>

        <div className="card">
          <div className="eyebrow">Gateway</div>
          <h3>未来统一入口</h3>
          <p>本地入口：7080</p>
          <p>当前阶段先不做复杂 SSO，不做微前端。</p>
        </div>
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
