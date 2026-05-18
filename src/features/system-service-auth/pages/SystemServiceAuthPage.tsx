import { useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  SystemServiceAuthCapabilityDTO,
  SystemServiceAuthCapabilityRouteDTO,
} from "../contracts/systemServiceAuth";
import { useSystemServiceAuthCapabilities } from "../hooks/useSystemServiceAuthCapabilities";

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

function BoolPill({ active }: { active: boolean }) {
  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? "启用" : "停用"}
    </span>
  );
}

function routeText(route: SystemServiceAuthCapabilityRouteDTO): string {
  return `${route.http_method} ${route.path} ${route.route_name}`;
}

function matchesKeyword(capability: SystemServiceAuthCapabilityDTO, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const routeHaystack = capability.routes.map(routeText).join(" ");

  const haystack = [
    capability.target_app_code,
    capability.target_app_name,
    capability.capability_code,
    capability.capability_name,
    capability.resource_code,
    capability.permission_code,
    capability.description ?? "",
    routeHaystack,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function CapabilityRoutes({ routes }: { routes: SystemServiceAuthCapabilityRouteDTO[] }) {
  if (routes.length === 0) {
    return <span className="admin-apps-muted">暂无路由</span>;
  }

  return (
    <div className="admin-apps-stack">
      {routes.map((route) => (
        <div key={`${route.http_method}-${route.path}`} className="admin-apps-muted">
          <div className="admin-apps-code">
            {route.http_method} {route.path}
          </div>
          <div>{route.route_name}</div>
          <div>
            认证：{route.auth_required ? "需要" : "不需要"}；状态：
            {route.is_active ? "启用" : "停用"}；同步：
            {formatDateTime(route.last_synced_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityCatalogTable({
  capabilities,
  loading,
  onRefresh,
}: {
  capabilities: SystemServiceAuthCapabilityDTO[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (capabilities.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>目标系统能力清单</h2>
            <p>暂无能力目录数据。请先在独立系统列表中同步业务系统自描述。</p>
          </div>
          <div className="admin-apps-row-actions">
            <button
              type="button"
              className="admin-apps-button secondary"
              disabled={loading}
              onClick={onRefresh}
            >
              刷新
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>目标系统能力清单</h2>
          <p>
            只读展示各目标系统通过 self-description 声明的 service capabilities 和 route mappings。
          </p>
        </div>
        <div className="admin-apps-row-actions">
          <button
            type="button"
            className="admin-apps-button secondary"
            disabled={loading}
            onClick={onRefresh}
          >
            刷新
          </button>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>目标系统</th>
              <th>能力</th>
              <th>权限 / 资源</th>
              <th>路由</th>
              <th>状态</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((capability) => (
              <tr key={`${capability.target_app_code}-${capability.capability_code}`}>
                <td>
                  <div className="admin-apps-code">{capability.target_app_code}</div>
                  <div>{capability.target_app_name}</div>
                </td>
                <td>
                  <div className="admin-apps-code">{capability.capability_code}</div>
                  <div>{capability.capability_name}</div>
                  <div className="admin-apps-muted">{emptyText(capability.description)}</div>
                </td>
                <td>
                  <div>{capability.permission_code}</div>
                  <div className="admin-apps-muted">resource: {capability.resource_code}</div>
                </td>
                <td>
                  <div className="admin-apps-muted">共 {capability.route_count} 条</div>
                  <CapabilityRoutes routes={capability.routes} />
                </td>
                <td>
                  <BoolPill active={capability.is_active} />
                </td>
                <td>
                  <div>{formatDateTime(capability.last_synced_at)}</div>
                  <div className="admin-apps-muted">
                    源更新时间：{formatDateTime(capability.source_updated_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemServiceAuthCapabilitiesPanel() {
  const { token, user } = useSessionRuntime();
  const [keyword, setKeyword] = useState("");

  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const {
    capabilities,
    targetOptions,
    targetAppCode,
    setTargetAppCode,
    loading,
    error,
    reload,
  } = useSystemServiceAuthCapabilities(token);

  const filteredCapabilities = useMemo(
    () => capabilities.filter((capability) => matchesKeyword(capability, keyword)),
    [capabilities, keyword],
  );

  if (!canRead) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>无访问权限</h2>
            <p>当前账号无系统协作配置访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载能力目录…</div> : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>能力目录筛选</h2>
            <p>按目标系统或关键字查看 ERP 已同步的服务能力声明。</p>
          </div>
          <div className="admin-apps-toolbar">
            <select
              value={targetAppCode}
              onChange={(event) => setTargetAppCode(event.target.value)}
            >
              <option value="">全部目标系统</option>
              {targetOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <input
              placeholder="搜索能力 / 权限 / 路由"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <CapabilityCatalogTable
        capabilities={filteredCapabilities}
        loading={loading}
        onRefresh={() => {
          void reload();
        }}
      />
    </div>
  );
}

function SystemServiceAuthPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-stack">
      <section className="card">
        <h3>{title}</h3>
        <p>{description}</p>
      </section>
    </div>
  );
}

export function SystemServiceAuthCapabilitiesPage() {
  return <SystemServiceAuthCapabilitiesPanel />;
}

export function SystemServiceAuthPermissionsPage() {
  return (
    <SystemServiceAuthPlaceholderPage
      title="调用授权"
      description="后续按 source app、target app、service client、capability 配置系统间调用许可。"
    />
  );
}

export function SystemServiceAuthWriteStatusPage() {
  return (
    <SystemServiceAuthPlaceholderPage
      title="写入状态"
      description="后续展示 ERP 写入目标系统 service auth 表的结果、失败原因、最近同步时间和可回滚记录。"
    />
  );
}
