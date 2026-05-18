import "../admin-apps/adminApps.css";
import { SystemAppsFrontendPagesPanel } from "../components/SystemAppsFrontendPagesPanel";

export function SystemAppsFrontendPagesPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">Frontend Page Catalog</div>
        <h2>独立系统前端页面目录</h2>
        <p>查看各独立系统同步到 ERP 的 manifest 摘要、最近同步记录和 page catalog。</p>
      </section>

      <SystemAppsFrontendPagesPanel />
    </div>
  );
}
