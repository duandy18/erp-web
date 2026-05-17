import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import { runSystemMonitoringHealthCheck } from "../api/systemMonitoringApi";
import type {
  SystemMonitoringAppStatus,
  SystemMonitoringDatabaseStatus,
  SystemMonitoringDependency,
  SystemMonitoringEndpointStatus,
  SystemMonitoringGatewayBinding,
  SystemMonitoringHealthCheck,
  SystemMonitoringOpenApiSource,
  SystemMonitoringOverview,
  SystemMonitoringServiceAuthResponse,
  SystemMonitoringStatus,
} from "../contracts/systemMonitoring";
import { useSystemMonitoringDatabases } from "../hooks/useSystemMonitoringDatabases";
import { useSystemMonitoringEndpoints } from "../hooks/useSystemMonitoringEndpoints";
import { useSystemMonitoringOverview } from "../hooks/useSystemMonitoringOverview";
import {
  useSystemMonitoringDependencies,
  useSystemMonitoringGateway,
  useSystemMonitoringHealth,
  useSystemMonitoringOpenApi,
  useSystemMonitoringServiceAuth,
} from "../hooks/useSystemMonitoringRemaining";

type MonitoringTabKey =
  | "overview"
  | "endpoints"
  | "databases"
  | "gateway"
  | "dependencies"
  | "service-auth"
  | "openapi"
  | "health";

type ReloadHandler = () => Promise<void>;

type RunHealthCheckHandler = (
  healthCheckId: number,
  afterRun: ReloadHandler,
) => Promise<void>;

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

function statusClassName(status: SystemMonitoringStatus): string {
  return status === "ok" ? "admin-apps-status success" : "admin-apps-status muted";
}

function StatusPill({ status }: { status: SystemMonitoringStatus }) {
  return <span className={statusClassName(status)}>{STATUS_LABELS[status]}</span>;
}

function BoolPill({ active }: { active: boolean }) {
  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? "启用" : "停用"}
    </span>
  );
}

function formatDateTime(value: string | null | undefined): string {
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

function emptyText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "执行检查失败";
}

function TableShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {actions ? <div className="admin-apps-row-actions">{actions}</div> : null}
      </div>
      <div className="admin-apps-table-wrap">{children}</div>
    </section>
  );
}

function EmptyCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
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

function LoadingAndError({
  loading,
  error,
  loadingText,
}: {
  loading: boolean;
  error: string | null;
  loadingText: string;
}) {
  return (
    <>
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">{loadingText}</div> : null}
    </>
  );
}

function RefreshButton({
  onRefresh,
  disabled,
}: {
  onRefresh: ReloadHandler;
  disabled: boolean;
}) {
  return (
    <button
      className="admin-apps-button secondary"
      disabled={disabled}
      type="button"
      onClick={() => {
        void onRefresh();
      }}
    >
      刷新
    </button>
  );
}

function RunHealthCheckButton({
  healthCheckId,
  runningHealthCheckId,
  onRun,
  reloadAfterRun,
}: {
  healthCheckId: number | null;
  runningHealthCheckId: number | null;
  onRun: RunHealthCheckHandler;
  reloadAfterRun: ReloadHandler;
}) {
  const running = healthCheckId !== null && runningHealthCheckId === healthCheckId;

  return (
    <button
      className="admin-apps-button secondary"
      disabled={healthCheckId === null || running}
      type="button"
      onClick={() => {
        if (healthCheckId !== null) {
          void onRun(healthCheckId, reloadAfterRun);
        }
      }}
    >
      {running ? "检查中…" : "执行检查"}
    </button>
  );
}

function ManualCheckAlerts({
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  return (
    <>
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {message ? <div className="admin-apps-alert">{message}</div> : null}
    </>
  );
}

function MonitoringOverviewCards({ overview }: { overview: SystemMonitoringOverview }) {
  const { summary } = overview;

  return (
    <section className="grid app-grid">
      <SummaryCard label="应用总数" value={summary.app_count} hint="ERP 当前纳管的注册应用数量。" />
      <SummaryCard label="正常" value={summary.normal_count} hint="所有关键状态均正常的应用。" />
      <SummaryCard label="待完善" value={summary.warning_count} hint="存在授权、依赖或配置待完善的应用。" />
      <SummaryCard
        label="异常 / 未检查"
        value={summary.error_count + summary.unchecked_count}
        hint="需要继续检查或处理的应用。"
      />
    </section>
  );
}

function MonitoringOverviewTable({
  rows,
  onRefresh,
  refreshDisabled,
}: {
  rows: SystemMonitoringAppStatus[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无监控数据" description="当前没有可展示的系统监控总览数据。" />;
  }

  return (
    <TableShell
      title="应用运行总览"
      description="只读展示各独立系统入口、API、DB、Gateway、OpenAPI、Service Auth 和依赖状态。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
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
                <BoolPill active={row.is_active} />
              </td>
              <td>
                <div>{row.web_path}</div>
                <div className="admin-apps-muted">{row.api_path}</div>
              </td>
              <td><StatusPill status={row.gateway_status} /></td>
              <td><StatusPill status={row.api_health_status} /></td>
              <td><StatusPill status={row.db_health_status} /></td>
              <td><StatusPill status={row.openapi_status} /></td>
              <td><StatusPill status={row.service_auth_status} /></td>
              <td><StatusPill status={row.dependency_status} /></td>
              <td><StatusPill status={row.overall_status} /></td>
              <td>{formatDateTime(row.latest_checked_at)}</td>
              <td>{row.issue_summary ?? "无"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringOverviewContent({
  overview,
  loading,
  error,
  reload,
}: {
  overview: SystemMonitoringOverview | null;
  loading: boolean;
  error: string | null;
  reload: ReloadHandler;
}) {
  return (
    <div className="admin-apps-stack">
      <LoadingAndError loading={loading} error={error} loadingText="正在加载系统监控总览…" />
      {overview ? <MonitoringOverviewCards overview={overview} /> : null}
      {overview ? (
        <MonitoringOverviewTable rows={overview.apps} onRefresh={reload} refreshDisabled={loading} />
      ) : null}
      {!overview && !loading && !error ? (
        <EmptyCard title="暂无监控数据" description="当前没有可展示的系统监控总览数据。" />
      ) : null}
    </div>
  );
}

function MonitoringEndpointsTable({
  rows,
  onRefresh,
  refreshDisabled,
  onRunHealthCheck,
  runningHealthCheckId,
}: {
  rows: SystemMonitoringEndpointStatus[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
  onRunHealthCheck: RunHealthCheckHandler;
  runningHealthCheckId: number | null;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无 API 状态数据" description="当前没有可展示的 API 端点状态。" />;
  }

  return (
    <TableShell
      title="API 状态"
      description="只读展示每个注册应用的 API 端点、Health 端点和最近一次 Health 检查结果。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>应用</th>
            <th>环境</th>
            <th>API URL</th>
            <th>Health URL</th>
            <th>API 启用</th>
            <th>Health 启用</th>
            <th>检查状态</th>
            <th>HTTP</th>
            <th>耗时</th>
            <th>最近检查</th>
            <th>问题摘要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.app_code}>
              <td>
                <div className="admin-apps-code">{row.app_code}</div>
                <div>{row.app_name}</div>
              </td>
              <td>{row.env_code ?? "-"}</td>
              <td>
                <div>{row.api_url ?? "-"}</div>
                <div className="admin-apps-muted">ID: {emptyText(row.api_endpoint_id)}</div>
              </td>
              <td>
                <div>{row.health_url ?? "-"}</div>
                <div className="admin-apps-muted">ID: {emptyText(row.health_endpoint_id)}</div>
              </td>
              <td><BoolPill active={row.api_endpoint_active} /></td>
              <td><BoolPill active={row.health_endpoint_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{emptyText(row.http_status)}</td>
              <td>{row.latency_ms === null ? "-" : `${row.latency_ms} ms`}</td>
              <td>{formatDateTime(row.latest_checked_at)}</td>
              <td>{row.issue_summary ?? "无"}</td>
              <td>
                <RunHealthCheckButton
                  healthCheckId={row.health_check_id}
                  onRun={onRunHealthCheck}
                  reloadAfterRun={onRefresh}
                  runningHealthCheckId={runningHealthCheckId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringDatabasesTable({
  rows,
  onRefresh,
  refreshDisabled,
  onRunHealthCheck,
  runningHealthCheckId,
}: {
  rows: SystemMonitoringDatabaseStatus[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
  onRunHealthCheck: RunHealthCheckHandler;
  runningHealthCheckId: number | null;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无数据库状态数据" description="当前没有可展示的数据库状态。" />;
  }

  return (
    <TableShell
      title="数据库状态"
      description="只读展示数据库登记信息、DB Health 端点和最近一次 DB Health 检查结果。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>应用</th>
            <th>环境</th>
            <th>数据库</th>
            <th>Schema</th>
            <th>迁移</th>
            <th>访问策略</th>
            <th>登记启用</th>
            <th>DB Health URL</th>
            <th>Health 启用</th>
            <th>检查状态</th>
            <th>HTTP</th>
            <th>耗时</th>
            <th>最近检查</th>
            <th>问题摘要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.app_code}-${row.database_id}`}>
              <td>
                <div className="admin-apps-code">{row.app_code}</div>
                <div>{row.app_name}</div>
              </td>
              <td>{row.env_code}</td>
              <td>
                <div>{row.db_engine}</div>
                <div className="admin-apps-muted">
                  {row.db_host_label}:{row.db_port}/{row.db_name}
                </div>
              </td>
              <td>{row.schema_name}</td>
              <td>
                <div>{row.migration_tool ?? "-"}</div>
                <div className="admin-apps-muted">{row.migration_command ?? "-"}</div>
              </td>
              <td>{row.access_policy}</td>
              <td><BoolPill active={row.database_active} /></td>
              <td>
                <div>{row.health_url ?? "-"}</div>
                <div className="admin-apps-muted">ID: {emptyText(row.health_endpoint_id)}</div>
              </td>
              <td><BoolPill active={row.health_endpoint_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{emptyText(row.http_status)}</td>
              <td>{row.latency_ms === null ? "-" : `${row.latency_ms} ms`}</td>
              <td>{formatDateTime(row.latest_checked_at)}</td>
              <td>{row.issue_summary ?? "无"}</td>
              <td>
                <RunHealthCheckButton
                  healthCheckId={row.health_check_id}
                  onRun={onRunHealthCheck}
                  reloadAfterRun={onRefresh}
                  runningHealthCheckId={runningHealthCheckId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringGatewayTable({
  rows,
  onRefresh,
  refreshDisabled,
}: {
  rows: SystemMonitoringGatewayBinding[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无 Gateway 状态数据" description="当前没有可展示的 Gateway 绑定。" />;
  }

  return (
    <TableShell
      title="Gateway 状态"
      description="只读展示各应用 Gateway Web/API 路径与上游配置。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>应用</th>
            <th>环境</th>
            <th>Web Path</th>
            <th>API Path</th>
            <th>Web Upstream</th>
            <th>API Upstream</th>
            <th>Rewrite</th>
            <th>发布</th>
            <th>启用</th>
            <th>状态</th>
            <th>发布时间</th>
            <th>问题摘要</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.binding_id}>
              <td>
                <div className="admin-apps-code">{row.app_code}</div>
                <div>{row.app_name}</div>
              </td>
              <td>{row.env_code}</td>
              <td>{row.web_path}</td>
              <td>{row.api_path}</td>
              <td>{emptyText(row.web_upstream_url)}</td>
              <td>{emptyText(row.api_upstream_url)}</td>
              <td>{row.rewrite_mode}</td>
              <td><BoolPill active={row.is_published} /></td>
              <td><BoolPill active={row.binding_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{formatDateTime(row.published_at)}</td>
              <td>{row.issue_summary ?? "无"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringDependenciesTable({
  rows,
  onRefresh,
  refreshDisabled,
}: {
  rows: SystemMonitoringDependency[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无系统依赖数据" description="当前没有可展示的系统依赖。" />;
  }

  return (
    <TableShell
      title="系统依赖状态"
      description="只读展示各独立系统之间的依赖关系和状态。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>来源系统</th>
            <th>目标系统</th>
            <th>类型</th>
            <th>说明</th>
            <th>必需</th>
            <th>依赖状态</th>
            <th>启用</th>
            <th>监控状态</th>
            <th>问题摘要</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dependency_id}>
              <td>
                <div className="admin-apps-code">{row.source_app_code}</div>
                <div>{row.source_app_name}</div>
              </td>
              <td>
                <div className="admin-apps-code">{row.target_app_code}</div>
                <div>{row.target_app_name}</div>
              </td>
              <td>{row.dependency_type}</td>
              <td>{row.description}</td>
              <td><BoolPill active={row.is_required} /></td>
              <td>{row.dependency_status}</td>
              <td><BoolPill active={row.dependency_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{row.issue_summary ?? "无"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringServiceAuthTables({
  data,
  onRefresh,
  refreshDisabled,
}: {
  data: SystemMonitoringServiceAuthResponse;
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
}) {
  return (
    <div className="admin-apps-stack">
      <TableShell
        title="Service Clients"
        description="只读展示各系统登记的 service client。"
        actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
      >
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>所属应用</th>
              <th>Client</th>
              <th>认证类型</th>
              <th>密钥引用</th>
              <th>启用</th>
              <th>状态</th>
              <th>问题摘要</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((row) => (
              <tr key={row.client_id}>
                <td>
                  <div className="admin-apps-code">{row.app_code}</div>
                  <div>{row.app_name}</div>
                </td>
                <td>
                  <div>{row.client_code}</div>
                  <div className="admin-apps-muted">{row.client_name}</div>
                </td>
                <td>{row.auth_type}</td>
                <td>{emptyText(row.secret_ref)}</td>
                <td><BoolPill active={row.client_active} /></td>
                <td><StatusPill status={row.status} /></td>
                <td>{row.issue_summary ?? "无"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="Service Permissions"
        description="只读展示系统间调用授权登记状态。"
      >
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>来源系统</th>
              <th>目标系统</th>
              <th>权限</th>
              <th>说明</th>
              <th>启用</th>
              <th>状态</th>
              <th>问题摘要</th>
            </tr>
          </thead>
          <tbody>
            {data.permissions.map((row) => (
              <tr key={row.permission_id}>
                <td>{row.client_code ?? `ID: ${row.client_id}`}</td>
                <td>
                  <div className="admin-apps-code">{row.source_app_code}</div>
                  <div>{row.source_app_name}</div>
                </td>
                <td>
                  <div className="admin-apps-code">{row.target_app_code}</div>
                  <div>{row.target_app_name}</div>
                </td>
                <td>{row.permission_code}</td>
                <td>{row.description}</td>
                <td><BoolPill active={row.permission_active} /></td>
                <td><StatusPill status={row.status} /></td>
                <td>{row.issue_summary ?? "无"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function MonitoringOpenApiTable({
  rows,
  onRefresh,
  refreshDisabled,
}: {
  rows: SystemMonitoringOpenApiSource[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无 OpenAPI 数据" description="当前没有可展示的 OpenAPI 来源。" />;
  }

  return (
    <TableShell
      title="OpenAPI 合同状态"
      description="只读展示各应用 OpenAPI 来源和最近拉取状态。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>应用</th>
            <th>环境</th>
            <th>OpenAPI URL</th>
            <th>Endpoint URL</th>
            <th>最后拉取</th>
            <th>Checksum</th>
            <th>拉取状态</th>
            <th>启用</th>
            <th>监控状态</th>
            <th>问题摘要</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source_id}>
              <td>
                <div className="admin-apps-code">{row.app_code}</div>
                <div>{row.app_name}</div>
              </td>
              <td>{row.env_code}</td>
              <td>{row.openapi_url}</td>
              <td>{emptyText(row.endpoint_url)}</td>
              <td>{formatDateTime(row.last_fetched_at)}</td>
              <td>{emptyText(row.last_checksum)}</td>
              <td>{row.last_status}</td>
              <td><BoolPill active={row.source_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{row.issue_summary ?? "无"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function MonitoringHealthTable({
  rows,
  onRefresh,
  refreshDisabled,
  onRunHealthCheck,
  runningHealthCheckId,
}: {
  rows: SystemMonitoringHealthCheck[];
  onRefresh: ReloadHandler;
  refreshDisabled: boolean;
  onRunHealthCheck: RunHealthCheckHandler;
  runningHealthCheckId: number | null;
}) {
  if (rows.length === 0) {
    return <EmptyCard title="暂无健康检查数据" description="当前没有可展示的健康检查配置。" />;
  }

  return (
    <TableShell
      title="健康检查"
      description="只读展示健康检查配置和最近一次执行结果。"
      actions={<RefreshButton disabled={refreshDisabled} onRefresh={onRefresh} />}
    >
      <table className="admin-apps-table">
        <thead>
          <tr>
            <th>应用</th>
            <th>环境</th>
            <th>端点</th>
            <th>URL</th>
            <th>检查类型</th>
            <th>期望</th>
            <th>超时/间隔</th>
            <th>级别</th>
            <th>检查启用</th>
            <th>端点启用</th>
            <th>状态</th>
            <th>HTTP</th>
            <th>耗时</th>
            <th>最近检查</th>
            <th>问题摘要</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.health_check_id}>
              <td>
                <div className="admin-apps-code">{row.app_code}</div>
                <div>{row.app_name}</div>
              </td>
              <td>{row.env_code}</td>
              <td>
                <div>{emptyText(row.endpoint_type)}</div>
                <div className="admin-apps-muted">{emptyText(row.endpoint_name)}</div>
              </td>
              <td>{emptyText(row.endpoint_url)}</td>
              <td>{row.check_type}</td>
              <td>{row.expected_status}</td>
              <td>
                <div>{row.timeout_ms} ms</div>
                <div className="admin-apps-muted">{row.interval_seconds} s</div>
              </td>
              <td>{row.severity}</td>
              <td><BoolPill active={row.check_active} /></td>
              <td><BoolPill active={row.endpoint_active} /></td>
              <td><StatusPill status={row.status} /></td>
              <td>{emptyText(row.http_status)}</td>
              <td>{row.latency_ms === null ? "-" : `${row.latency_ms} ms`}</td>
              <td>{formatDateTime(row.latest_checked_at)}</td>
              <td>{row.issue_summary ?? "无"}</td>
              <td>
                <RunHealthCheckButton
                  healthCheckId={row.health_check_id}
                  onRun={onRunHealthCheck}
                  reloadAfterRun={onRefresh}
                  runningHealthCheckId={runningHealthCheckId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

function SimpleTabContent({
  loading,
  error,
  loadingText,
  manualMessage,
  manualError,
  children,
}: {
  loading: boolean;
  error: string | null;
  loadingText: string;
  manualMessage?: string | null;
  manualError?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="admin-apps-stack">
      <LoadingAndError loading={loading} error={error} loadingText={loadingText} />
      <ManualCheckAlerts error={manualError ?? null} message={manualMessage ?? null} />
      {!loading && !error ? children : null}
    </div>
  );
}

function MonitoringTabContent({
  activeTab,
  overview,
  overviewLoading,
  overviewError,
  reloadOverview,
  endpointRows,
  endpointsLoading,
  endpointsError,
  reloadEndpoints,
  databaseRows,
  databasesLoading,
  databasesError,
  reloadDatabases,
  gatewayRows,
  gatewayLoading,
  gatewayError,
  reloadGateway,
  dependencyRows,
  dependenciesLoading,
  dependenciesError,
  reloadDependencies,
  serviceAuth,
  serviceAuthLoading,
  serviceAuthError,
  reloadServiceAuth,
  openapiRows,
  openapiLoading,
  openapiError,
  reloadOpenApi,
  healthRows,
  healthLoading,
  healthError,
  reloadHealth,
  onRunHealthCheck,
  runningHealthCheckId,
  manualCheckMessage,
  manualCheckError,
}: {
  activeTab: MonitoringTabKey;
  overview: SystemMonitoringOverview | null;
  overviewLoading: boolean;
  overviewError: string | null;
  reloadOverview: ReloadHandler;
  endpointRows: SystemMonitoringEndpointStatus[];
  endpointsLoading: boolean;
  endpointsError: string | null;
  reloadEndpoints: ReloadHandler;
  databaseRows: SystemMonitoringDatabaseStatus[];
  databasesLoading: boolean;
  databasesError: string | null;
  reloadDatabases: ReloadHandler;
  gatewayRows: SystemMonitoringGatewayBinding[];
  gatewayLoading: boolean;
  gatewayError: string | null;
  reloadGateway: ReloadHandler;
  dependencyRows: SystemMonitoringDependency[];
  dependenciesLoading: boolean;
  dependenciesError: string | null;
  reloadDependencies: ReloadHandler;
  serviceAuth: SystemMonitoringServiceAuthResponse;
  serviceAuthLoading: boolean;
  serviceAuthError: string | null;
  reloadServiceAuth: ReloadHandler;
  openapiRows: SystemMonitoringOpenApiSource[];
  openapiLoading: boolean;
  openapiError: string | null;
  reloadOpenApi: ReloadHandler;
  healthRows: SystemMonitoringHealthCheck[];
  healthLoading: boolean;
  healthError: string | null;
  reloadHealth: ReloadHandler;
  onRunHealthCheck: RunHealthCheckHandler;
  runningHealthCheckId: number | null;
  manualCheckMessage: string | null;
  manualCheckError: string | null;
}) {
  if (activeTab === "overview") {
    return (
      <MonitoringOverviewContent
        overview={overview}
        loading={overviewLoading}
        error={overviewError}
        reload={reloadOverview}
      />
    );
  }

  if (activeTab === "endpoints") {
    return (
      <SimpleTabContent
        loading={endpointsLoading}
        error={endpointsError}
        loadingText="正在加载 API 状态…"
        manualMessage={manualCheckMessage}
        manualError={manualCheckError}
      >
        <MonitoringEndpointsTable
          rows={endpointRows}
          onRefresh={reloadEndpoints}
          refreshDisabled={endpointsLoading}
          onRunHealthCheck={onRunHealthCheck}
          runningHealthCheckId={runningHealthCheckId}
        />
      </SimpleTabContent>
    );
  }

  if (activeTab === "databases") {
    return (
      <SimpleTabContent
        loading={databasesLoading}
        error={databasesError}
        loadingText="正在加载数据库状态…"
        manualMessage={manualCheckMessage}
        manualError={manualCheckError}
      >
        <MonitoringDatabasesTable
          rows={databaseRows}
          onRefresh={reloadDatabases}
          refreshDisabled={databasesLoading}
          onRunHealthCheck={onRunHealthCheck}
          runningHealthCheckId={runningHealthCheckId}
        />
      </SimpleTabContent>
    );
  }

  if (activeTab === "gateway") {
    return (
      <SimpleTabContent loading={gatewayLoading} error={gatewayError} loadingText="正在加载 Gateway 状态…">
        <MonitoringGatewayTable rows={gatewayRows} onRefresh={reloadGateway} refreshDisabled={gatewayLoading} />
      </SimpleTabContent>
    );
  }

  if (activeTab === "dependencies") {
    return (
      <SimpleTabContent
        loading={dependenciesLoading}
        error={dependenciesError}
        loadingText="正在加载系统依赖状态…"
      >
        <MonitoringDependenciesTable
          rows={dependencyRows}
          onRefresh={reloadDependencies}
          refreshDisabled={dependenciesLoading}
        />
      </SimpleTabContent>
    );
  }

  if (activeTab === "service-auth") {
    return (
      <SimpleTabContent
        loading={serviceAuthLoading}
        error={serviceAuthError}
        loadingText="正在加载 Service Auth 状态…"
      >
        <MonitoringServiceAuthTables
          data={serviceAuth}
          onRefresh={reloadServiceAuth}
          refreshDisabled={serviceAuthLoading}
        />
      </SimpleTabContent>
    );
  }

  if (activeTab === "openapi") {
    return (
      <SimpleTabContent loading={openapiLoading} error={openapiError} loadingText="正在加载 OpenAPI 合同状态…">
        <MonitoringOpenApiTable rows={openapiRows} onRefresh={reloadOpenApi} refreshDisabled={openapiLoading} />
      </SimpleTabContent>
    );
  }

  if (activeTab === "health") {
    return (
      <SimpleTabContent
        loading={healthLoading}
        error={healthError}
        loadingText="正在加载健康检查状态…"
        manualMessage={manualCheckMessage}
        manualError={manualCheckError}
      >
        <MonitoringHealthTable
          rows={healthRows}
          onRefresh={reloadHealth}
          refreshDisabled={healthLoading}
          onRunHealthCheck={onRunHealthCheck}
          runningHealthCheckId={runningHealthCheckId}
        />
      </SimpleTabContent>
    );
  }

  return null;
}

export function SystemMonitoringPage() {
  const location = useLocation();
  const activeTab = getActiveTab(location.pathname);
  const { token } = useSessionRuntime();
  const [runningHealthCheckId, setRunningHealthCheckId] = useState<number | null>(null);
  const [manualCheckMessage, setManualCheckMessage] = useState<string | null>(null);
  const [manualCheckError, setManualCheckError] = useState<string | null>(null);

  const {
    overview,
    loading: overviewLoading,
    error: overviewError,
    reload: reloadOverview,
  } = useSystemMonitoringOverview(token);
  const {
    endpoints,
    loading: endpointsLoading,
    error: endpointsError,
    reload: reloadEndpoints,
  } = useSystemMonitoringEndpoints(token, activeTab === "endpoints");
  const {
    databases,
    loading: databasesLoading,
    error: databasesError,
    reload: reloadDatabases,
  } = useSystemMonitoringDatabases(token, activeTab === "databases");
  const {
    data: gatewayRows,
    loading: gatewayLoading,
    error: gatewayError,
    reload: reloadGateway,
  } = useSystemMonitoringGateway(token, activeTab === "gateway");
  const {
    data: dependencyRows,
    loading: dependenciesLoading,
    error: dependenciesError,
    reload: reloadDependencies,
  } = useSystemMonitoringDependencies(token, activeTab === "dependencies");
  const {
    data: serviceAuth,
    loading: serviceAuthLoading,
    error: serviceAuthError,
    reload: reloadServiceAuth,
  } = useSystemMonitoringServiceAuth(token, activeTab === "service-auth");
  const {
    data: openapiRows,
    loading: openapiLoading,
    error: openapiError,
    reload: reloadOpenApi,
  } = useSystemMonitoringOpenApi(token, activeTab === "openapi");
  const {
    data: healthRows,
    loading: healthLoading,
    error: healthError,
    reload: reloadHealth,
  } = useSystemMonitoringHealth(token, activeTab === "health");

  const handleRunHealthCheck = useCallback<RunHealthCheckHandler>(
    async (healthCheckId, afterRun) => {
      if (!token) {
        setManualCheckMessage(null);
        setManualCheckError("缺少登录凭证");
        return;
      }

      setRunningHealthCheckId(healthCheckId);
      setManualCheckMessage(null);
      setManualCheckError(null);

      try {
        const result = await runSystemMonitoringHealthCheck(token, healthCheckId);
        await afterRun();
        setManualCheckMessage(`健康检查 #${result.health_check_id} 已执行：${result.status}`);
      } catch (error) {
        setManualCheckError(toErrorMessage(error));
      } finally {
        setRunningHealthCheckId(null);
      }
    },
    [token],
  );

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

      <MonitoringTabContent
        activeTab={activeTab}
        overview={overview}
        overviewLoading={overviewLoading}
        overviewError={overviewError}
        reloadOverview={reloadOverview}
        endpointRows={endpoints}
        endpointsLoading={endpointsLoading}
        endpointsError={endpointsError}
        reloadEndpoints={reloadEndpoints}
        databaseRows={databases}
        databasesLoading={databasesLoading}
        databasesError={databasesError}
        reloadDatabases={reloadDatabases}
        gatewayRows={gatewayRows}
        gatewayLoading={gatewayLoading}
        gatewayError={gatewayError}
        reloadGateway={reloadGateway}
        dependencyRows={dependencyRows}
        dependenciesLoading={dependenciesLoading}
        dependenciesError={dependenciesError}
        reloadDependencies={reloadDependencies}
        serviceAuth={serviceAuth}
        serviceAuthLoading={serviceAuthLoading}
        serviceAuthError={serviceAuthError}
        reloadServiceAuth={reloadServiceAuth}
        openapiRows={openapiRows}
        openapiLoading={openapiLoading}
        openapiError={openapiError}
        reloadOpenApi={reloadOpenApi}
        healthRows={healthRows}
        healthLoading={healthLoading}
        healthError={healthError}
        reloadHealth={reloadHealth}
        onRunHealthCheck={handleRunHealthCheck}
        runningHealthCheckId={runningHealthCheckId}
        manualCheckMessage={manualCheckMessage}
        manualCheckError={manualCheckError}
      />
    </div>
  );
}
