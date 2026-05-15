import { AdminUsersPanel } from "../admin-users/components/AdminUsersPanel";
import { useAdminUsersPresenter } from "../admin-users/hooks/useAdminUsersPresenter";
import "../admin-users/adminUsers.css";
import { useSessionRuntime } from "../runtime/useSessionRuntime";

export function SystemUsersPage() {
  const { token } = useSessionRuntime();
  const presenter = useAdminUsersPresenter(token);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">IAM</div>
        <h2>用户管理</h2>
        <p>ERP 总控平台用户、状态与一级页面权限矩阵管理。</p>
      </section>

      <AdminUsersPanel presenter={presenter} />
    </div>
  );
}
