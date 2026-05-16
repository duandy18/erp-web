import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import "../admin-apps/adminApps.css";
import { AdminAppsPanel } from "../admin-apps/components/AdminAppsPanel";
import { useAdminAppsPresenter } from "../admin-apps/hooks/useAdminAppsPresenter";
import type {
  AppMetadataAppEnvironment,
  AppMetadataComponent,
  AppMetadataEnvironment,
  AppMetadataGatewayBinding,
  AppMetadataRepository,
  AppRegistryMetadataProfile,
} from "../app-metadata/contracts/appMetadata";
import { useAppRegistryMetadata } from "../app-metadata/hooks/useAppRegistryMetadata";

type AppRegistryTabKey =
  | "basic"
  | "components"
  | "environments"
  | "app-environments"
  | "repositories"
  | "gateway";

const APP_REGISTRY_TABS: { key: AppRegistryTabKey; label: string; path: string }[] = [
  { key: "basic", label: "基础信息", path: "/system/apps" },
  { key: "components", label: "组件", path: "/system/apps/components" },
  { key: "environments", label: "环境", path: "/system/apps/environments" },
  { key: "app-environments", label: "应用环境", path: "/system/apps/app-environments" },
  { key: "repositories", label: "仓库", path: "/system/apps/repositories" },
  { key: "gateway", label: "Gateway 配置", path: "/system/apps/gateway" },
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getActiveTab(pathname: string): AppRegistryTabKey {
  const normalizedPath = normalizePath(pathname);
  return APP_REGISTRY_TABS.find((tab) => tab.path === normalizedPath)?.key ?? "basic";
}

function StatusText({
  active,
  activeText = "启用",
  inactiveText = "停用",
}: {
  active: boolean;
  activeText?: string;
  inactiveText?: string;
}) {
  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? activeText : inactiveText}
    </span>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-apps-empty-cell">
        {text}
      </td>
    </tr>
  );
}

function ComponentsTable({ rows }: { rows: AppMetadataComponent[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>组件</h2>
          <p>展示该应用的前端、后端、任务等组成部分。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>组件编码</th>
              <th>类型</th>
              <th>名称</th>
              <th>说明</th>
              <th>必需</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={6} text="暂无组件信息" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-apps-code">{row.component_code}</div>
                  </td>
                  <td>{row.component_type}</td>
                  <td>{row.name}</td>
                  <td>{row.description}</td>
                  <td>{row.is_required ? "必需" : "可选"}</td>
                  <td>
                    <StatusText active={row.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EnvironmentsTable({ rows }: { rows: AppMetadataEnvironment[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>环境</h2>
          <p>展示 ERP 当前登记的环境字典。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>环境编码</th>
              <th>名称</th>
              <th>说明</th>
              <th>排序</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} text="暂无环境信息" />
            ) : (
              rows.map((row) => (
                <tr key={row.env_code}>
                  <td>
                    <div className="admin-apps-code">{row.env_code}</div>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.description}</td>
                  <td>{row.sort_order}</td>
                  <td>
                    <StatusText active={row.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AppEnvironmentsTable({ rows }: { rows: AppMetadataAppEnvironment[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>应用环境</h2>
          <p>展示应用在各环境下的启用状态和默认环境。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>显示名称</th>
              <th>默认</th>
              <th>状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5} text="暂无应用环境信息" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-apps-code">{row.env_code}</div>
                  </td>
                  <td>{row.display_name}</td>
                  <td>{row.is_default ? "默认" : "-"}</td>
                  <td>
                    <StatusText active={row.is_active} />
                  </td>
                  <td>{row.notes ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RepositoriesTable({ rows }: { rows: AppMetadataRepository[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>仓库</h2>
          <p>展示应用关联的代码仓库、本地路径和 CI 工作流。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>Provider</th>
              <th>Owner</th>
              <th>Repo</th>
              <th>默认分支</th>
              <th>本地路径</th>
              <th>CI</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} text="暂无仓库信息" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.repo_type}</td>
                  <td>{row.provider}</td>
                  <td>{row.repo_owner}</td>
                  <td>
                    <div className="admin-apps-code">{row.repo_name}</div>
                  </td>
                  <td>{row.default_branch}</td>
                  <td>{row.local_path ?? "-"}</td>
                  <td>{row.ci_workflow_name ?? "-"}</td>
                  <td>
                    <StatusText active={row.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GatewayBindingsTable({ rows }: { rows: AppMetadataGatewayBinding[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>Gateway 配置</h2>
          <p>展示应用在各环境下的 Gateway Web / API 路径和上游地址。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>Web 路径</th>
              <th>API 路径</th>
              <th>Web 上游</th>
              <th>API 上游</th>
              <th>Rewrite</th>
              <th>发布</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} text="暂无 Gateway 配置信息" />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="admin-apps-code">{row.env_code}</div>
                  </td>
                  <td>{row.web_path}</td>
                  <td>{row.api_path}</td>
                  <td>{row.web_upstream_url ?? "-"}</td>
                  <td>{row.api_upstream_url ?? "-"}</td>
                  <td>{row.rewrite_mode}</td>
                  <td>{row.is_published ? "已发布" : "未发布"}</td>
                  <td>
                    <StatusText active={row.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AppMetadataSelector({
  profiles,
  selectedProfile,
  onSelect,
}: {
  profiles: AppRegistryMetadataProfile[];
  selectedProfile: AppRegistryMetadataProfile | null;
  onSelect: (appCode: string) => void;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>应用主档</h2>
          <p>选择应用后查看组件、环境、应用环境、仓库和 Gateway 配置。</p>
        </div>

        <div className="admin-apps-toolbar">
          <select
            value={selectedProfile?.app.code ?? ""}
            onChange={(event) => onSelect(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.app.code} value={profile.app.code}>
                {profile.app.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProfile ? (
        <dl className="contract-list">
          <div>
            <dt>应用编码</dt>
            <dd>{selectedProfile.app.code}</dd>
          </div>
          <div>
            <dt>应用名称</dt>
            <dd>{selectedProfile.app.name}</dd>
          </div>
          <div>
            <dt>领域</dt>
            <dd>{selectedProfile.app.domain_code}</dd>
          </div>
          <div>
            <dt>应用类型</dt>
            <dd>{selectedProfile.app.app_type}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{selectedProfile.app.status}</dd>
          </div>
          <div>
            <dt>启停</dt>
            <dd>{selectedProfile.app.is_active ? "启用" : "停用"}</dd>
          </div>
        </dl>
      ) : (
        <div className="admin-apps-muted">暂无应用主档信息。</div>
      )}
    </section>
  );
}

function AppMetadataTabContent({
  activeTab,
  profiles,
  loading,
  error,
}: {
  activeTab: AppRegistryTabKey;
  profiles: AppRegistryMetadataProfile[];
  loading: boolean;
  error: string | null;
}) {
  const [selectedAppCode, setSelectedAppCode] = useState("");

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((left, right) => {
        if (left.app.sort_order !== right.app.sort_order) {
          return left.app.sort_order - right.app.sort_order;
        }

        return left.app.code.localeCompare(right.app.code);
      }),
    [profiles],
  );

  const selectedProfile =
    sortedProfiles.find((profile) => profile.app.code === selectedAppCode) ?? sortedProfiles[0] ?? null;

  if (activeTab === "basic") {
    return null;
  }

  return (
    <section className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载应用主档信息…</div> : null}

      <AppMetadataSelector
        profiles={sortedProfiles}
        selectedProfile={selectedProfile}
        onSelect={setSelectedAppCode}
      />

      {selectedProfile && activeTab === "components" ? (
        <ComponentsTable rows={selectedProfile.components} />
      ) : null}
      {selectedProfile && activeTab === "environments" ? (
        <EnvironmentsTable rows={selectedProfile.environments} />
      ) : null}
      {selectedProfile && activeTab === "app-environments" ? (
        <AppEnvironmentsTable rows={selectedProfile.app_environments} />
      ) : null}
      {selectedProfile && activeTab === "repositories" ? (
        <RepositoriesTable rows={selectedProfile.repositories} />
      ) : null}
      {selectedProfile && activeTab === "gateway" ? (
        <GatewayBindingsTable rows={selectedProfile.gateway_bindings} />
      ) : null}
    </section>
  );
}

export function SystemAppsPage() {
  const location = useLocation();
  const { token } = useSessionRuntime();
  const presenter = useAdminAppsPresenter(token);
  const metadata = useAppRegistryMetadata(token);
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">App Registry</div>
        <h2>应用注册</h2>
        <p>维护 ERP 控制面中的应用入口、API、本地端口、组件、环境、仓库和 Gateway 配置。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-toolbar">
          {APP_REGISTRY_TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              end={tab.path === "/system/apps"}
              className={({ isActive }) =>
                isActive ? "admin-apps-button primary" : "admin-apps-button secondary"
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </section>

      {activeTab === "basic" ? <AdminAppsPanel presenter={presenter} /> : null}

      <AppMetadataTabContent
        activeTab={activeTab}
        profiles={metadata.profiles}
        loading={metadata.loading}
        error={metadata.error}
      />
    </div>
  );
}
