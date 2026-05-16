import { NavLink, useLocation } from "react-router-dom";

type MonitoringTabKey =
  | "overview"
  | "endpoints"
  | "databases"
  | "gateway"
  | "dependencies"
  | "service-auth"
  | "openapi"
  | "health";

const MONITORING_TABS: { key: MonitoringTabKey; label: string; path: string }[] = [
  { key: "overview", label: "应用运行总览", path: "/system/monitoring" },
  { key: "endpoints", label: "API 状态", path: "/system/monitoring/endpoints" },
  { key: "databases", label: "数据库状态", path: "/system/monitoring/databases" },
  { key: "gateway", label: "Gateway 状态", path: "/system/monitoring/gateway" },
  { key: "dependencies", label: "系统依赖状态", path: "/system/monitoring/dependencies" },
  { key: "service-auth", label: "Service Auth 状态", path: "/system/monitoring/service-auth" },
  { key: "openapi", label: "OpenAPI 合同状态", path: "/system/monitoring/openapi" },
  { key: "health", label: "健康检查", path: "/system/monitoring/health" },
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getActiveTab(pathname: string): MonitoringTabKey {
  const normalizedPath = normalizePath(pathname);
  return MONITORING_TABS.find((tab) => tab.path === normalizedPath)?.key ?? "overview";
}

function monitoringTitle(activeTab: MonitoringTabKey): string {
  const matched = MONITORING_TABS.find((tab) => tab.key === activeTab);
  return matched?.label ?? "应用运行总览";
}

function MonitoringTabContent({ activeTab }: { activeTab: MonitoringTabKey }) {
  const title = monitoringTitle(activeTab);

  if (activeTab === "overview") {
    return (
      <section className="grid two-columns">
        <article className="card">
          <h3>应用运行总览</h3>
          <p>后续汇总应用启用状态、入口状态、API 状态、DB 状态和整体状态。</p>
        </article>

        <article className="card">
          <h3>当前异常</h3>
          <p>后续集中展示各系统入口、接口、依赖、授权和合同异常。</p>
        </article>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>{title}</h3>
      <p>后续从应用主档、Gateway、健康检查、OpenAPI 和 service auth 状态中汇总展示。</p>
    </section>
  );
}

export function SystemMonitoringPage() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">System Monitoring</div>
        <h2>系统监控</h2>
        <p>查看各系统入口、Gateway、API、DB、依赖、Service Auth 和 OpenAPI 合同状态。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-toolbar">
          {MONITORING_TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              end={tab.path === "/system/monitoring"}
              className={({ isActive }) =>
                isActive ? "admin-apps-button primary" : "admin-apps-button secondary"
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </section>

      <MonitoringTabContent activeTab={activeTab} />
    </div>
  );
}
