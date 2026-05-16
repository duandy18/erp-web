import { NavLink, useLocation } from "react-router-dom";

type ServiceAuthTabKey = "capabilities" | "permissions" | "write-status";

const SERVICE_AUTH_TABS: { key: ServiceAuthTabKey; label: string; path: string }[] = [
  { key: "capabilities", label: "能力目录", path: "/system/service-auth/capabilities" },
  { key: "permissions", label: "调用授权", path: "/system/service-auth/permissions" },
  { key: "write-status", label: "写入状态", path: "/system/service-auth/write-status" },
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getActiveTab(pathname: string): ServiceAuthTabKey {
  const normalizedPath = normalizePath(pathname);
  return SERVICE_AUTH_TABS.find((tab) => tab.path === normalizedPath)?.key ?? "capabilities";
}

function ServiceAuthTabContent({ activeTab }: { activeTab: ServiceAuthTabKey }) {
  if (activeTab === "capabilities") {
    return (
      <section className="card">
        <h3>能力目录</h3>
        <p>
          后续从各目标系统读取 service capabilities 和 route mappings，ERP 只展示目标系统声明过的能力。
        </p>
      </section>
    );
  }

  if (activeTab === "permissions") {
    return (
      <section className="card">
        <h3>调用授权</h3>
        <p>
          后续按 source app、target app、service client、capability 配置系统间调用许可。
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>写入状态</h3>
      <p>
        后续展示 ERP 写入目标系统 service auth 表的结果、失败原因、最近同步时间和可回滚记录。
      </p>
    </section>
  );
}

export function SystemServiceAuthPage() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">Service Auth</div>
        <h2>系统协作配置</h2>
        <p>配置系统之间谁可以调用谁、可以使用哪些能力，并查看授权写入状态。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-toolbar">
          {SERVICE_AUTH_TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                isActive ? "admin-apps-button primary" : "admin-apps-button secondary"
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </section>

      <ServiceAuthTabContent activeTab={activeTab} />
    </div>
  );
}
