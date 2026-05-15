import { Link } from "react-router-dom";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import "../admin-apps/adminApps.css";
import { AdminAppsPanel } from "../admin-apps/components/AdminAppsPanel";
import { useAdminAppsPresenter } from "../admin-apps/hooks/useAdminAppsPresenter";

export function SystemAppsPage() {
  const { token } = useSessionRuntime();
  const presenter = useAdminAppsPresenter(token);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">App Registry</div>
        <h2>应用注册</h2>
        <p>维护 ERP 控制面中的业务系统入口、API 路径、本地端口合同和启停状态。</p>
      </section>

      <section className="admin-apps-card admin-apps-profile-links">
        <div className="admin-apps-table-header">
          <div>
            <h2>系统档案</h2>
            <p>查看组件、环境、端点、数据库元信息和代码仓库档案。</p>
          </div>
        </div>

        <div className="admin-apps-profile-grid">
          {presenter.apps.length === 0 ? (
            <div className="admin-apps-muted">暂无可查看的系统档案。</div>
          ) : (
            presenter.apps.map((app) => (
              <Link
                key={app.code}
                className="admin-apps-profile-link"
                to={`/system/apps/${app.code}/overview`}
              >
                <span>{app.name}</span>
                <strong>{app.code}</strong>
              </Link>
            ))
          )}
        </div>
      </section>

      <AdminAppsPanel presenter={presenter} />
    </div>
  );
}
