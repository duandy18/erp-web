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
        <p>维护 ERP 控制面中的应用入口、API 路径、本地端口合同和启停状态。</p>
      </section>

      <AdminAppsPanel presenter={presenter} />
    </div>
  );
}
