import { NavLink, useLocation } from "react-router-dom";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  SystemMonitoringAppStatus,
  SystemMonitoringOverview,
  SystemMonitoringStatus,
} from "../contracts/systemMonitoring";
import { useSystemMonitoringOverview } from "../hooks/useSystemMonitoringOverview";

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

const STATUS_LABELS: Record<SystemMonitoringStatus, string> = {
  ok: "正常",
  warning: "待完善",
  error: "异常",
  timeout: "超时",
  unchecked: "未检查",
  not_configured: "未配置",
};

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

function statusClassName(status: SystemMonitoringStatus): string {
  return status === "ok" ? "admin-apps-status success" : "admin-apps-status muted";
}

function StatusPill({ status }: { status: SystemMonitoringStatus }) {
  return <span className={statusClassName(status)}>{STATUS_LABELS[status]}</span>;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "暂无";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <article className="card">
      <div className="eyebrow">{label}</div>
      <h3>{value}</h3>
      <p>{hint}</p>
    </article>
  );
}

function MonitoringOverviewCards({ overview }: { overview: SystemMonitoringOverview }) {
  const { summary } = overview;

  return (
    <section className="grid app-grid">
      <SummaryCard label="应用总数" value={summary.app_count} hint="ERP 当前纳管的注册应用数量。" />
      <SummaryCard label="正常" value={summary.normal_count} hint="所有关键状态均正常的应用。" />
      <SummaryCard label="待完善" value={summary.warning_count} hint="存在授权、依赖或配置待完善的应用。" />
      <SummaryCard label="异常 / 未检查" value={summary.error_count + summary.unchecked_count} hint="需要继续检查或处理的应用。" />
    </section>
  );
}

function EmptyOverview() {
  return (
    <section className="card">
      <h3>暂无监控数据</h3>
      <p>当前没有可展示的系统监控总览数据。</p>
    </section>
  );
}

function MonitoringOverviewTable({ rows }: { rows: SystemMonitoringAppStatus[] }) {
  if (rows.length === 0) {
    return <EmptyOverview />;
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>应用运行总览</h2>
          <p>只读展示各独立系统入口、API、DB、Gateway、OpenAPI、Service Auth 和依赖状态。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>应用</th>
              <th>入口</th>
              <th>Gateway</th>
              <th>API Health</th>
              <th>DB Health</th>
              <th>OpenAPI</th>
              <th>Service Auth</th>
              <th>系统依赖</th>
              <th>整体</th>
              <th>最近检查</th>
              <th>问题摘要</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.app_code}>
                <td>
                  <div className="admin-apps-code">{row.app_code}</div>
                  <div>{row.app_name}</div>
                  <span className={row.is_active ? "admin-apps-status success" : "admin-apps-status muted"}>
                    {row.is_active ? "启用" : "停用"}
                  </span>
                </td>
                <td>
                  <div>{row.web_path}</div>
                  <div className="admin-apps-muted">{row.api_path}</div>
                </td>
                <td>
                  <StatusPill status={row.gateway_status} />
                </td>
                <td>
                  <StatusPill status={row.api_health_status} />
                </td>
                <td>
                  <StatusPill status={row.db_health_status} />
                </td>
                <td>
                  <StatusPill status={row.openapi_status} />
                </td>
                <td>
                  <StatusPill status={row.service_auth_status} />
                </td>
                <td>
                  <StatusPill status={row.dependency_status} />
                </td>
                <td>
                  <StatusPill status={row.overall_status} />
                </td>
                <td>{formatDateTime(row.latest_checked_at)}</td>
                <td>{row.issue_summary ?? "无"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MonitoringOverviewContent({
  overview,
  loading,
  error,
}: {
  overview: SystemMonitoringOverview | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载系统监控总览…</div> : null}
      {overview ? <MonitoringOverviewCards overview={overview} /> : null}
      {overview ? <MonitoringOverviewTable rows={overview.apps} /> : null}
      {!overview && !loading && !error ? <EmptyOverview /> : null}
    </div>
  );
}

function MonitoringTabContent({
  activeTab,
  overview,
  loading,
  error,
}: {
  activeTab: MonitoringTabKey;
  overview: SystemMonitoringOverview | null;
  loading: boolean;
  error: string | null;
}) {
  const title = monitoringTitle(activeTab);

  if (activeTab === "overview") {
    return <MonitoringOverviewContent overview={overview} loading={loading} error={error} />;
  }

  return (
    <section className="card">
      <h3>{title}</h3>
      <p>总览数据已接入，当前维度将在后续从系统监控只读接口中继续展开。</p>
    </section>
  );
}

export function SystemMonitoringPage() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const { token } = useSessionRuntime();
  const { overview, loading, error } = useSystemMonitoringOverview(token);

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

      <MonitoringTabContent activeTab={activeTab} overview={overview} loading={loading} error={error} />
    </div>
  );
}
