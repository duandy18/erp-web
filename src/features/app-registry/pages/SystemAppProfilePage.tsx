import { Link, Navigate, NavLink, useParams } from "react-router-dom";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import "../system-profile/systemProfile.css";
import { useSystemProfile } from "../system-profile/hooks/useSystemProfile";
import type {
  AppRegistrySystemProfile,
  SystemProfileAppEnvironment,
  SystemProfileComponent,
  SystemProfileDatabase,
  SystemProfileDependency,
  SystemProfileEndpoint,
  SystemProfileEnvironment,
  SystemProfileGatewayBinding,
  SystemProfileRepository,
  SystemProfileServiceClient,
  SystemProfileServicePermission,
} from "../system-profile/contracts/systemProfile";

const SECTIONS = [
  { key: "overview", label: "总览" },
  { key: "components", label: "组件" },
  { key: "environments", label: "环境" },
  { key: "endpoints", label: "端点" },
  { key: "databases", label: "数据库" },
  { key: "repositories", label: "仓库" },
  { key: "gateway", label: "Gateway" },
  { key: "dependencies", label: "依赖关系" },
  { key: "service-auth", label: "系统授权" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function isSectionKey(value: string | undefined): value is SectionKey {
  return SECTIONS.some((section) => section.key === value);
}

function boolText(value: boolean): string {
  return value ? "是" : "否";
}

function textOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? "system-profile-badge success" : "system-profile-badge muted"}>
      {active ? "启用" : "停用"}
    </span>
  );
}

function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span className={published ? "system-profile-badge success" : "system-profile-badge muted"}>
      {published ? "已发布" : "未发布"}
    </span>
  );
}

function FieldGrid({ rows }: { rows: { label: string; value: string | number | null | undefined }[] }) {
  return (
    <dl className="system-profile-grid">
      {rows.map((row) => (
        <div key={row.label} className="system-profile-field">
          <dt>{row.label}</dt>
          <dd>{textOrDash(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="system-profile-empty">
        暂无系统档案数据
      </td>
    </tr>
  );
}

function OverviewSection({ profile }: { profile: AppRegistrySystemProfile }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>基础信息</h3>
      <FieldGrid
        rows={[
          { label: "应用编码", value: profile.app.code },
          { label: "应用名称", value: profile.app.name },
          { label: "领域", value: profile.app.domain_code },
          { label: "应用类型", value: profile.app.app_type },
          { label: "生命周期", value: profile.app.status },
          { label: "排序", value: profile.app.sort_order },
          { label: "Gateway Web", value: profile.app.web_path },
          { label: "Gateway API", value: profile.app.api_path },
          { label: "Local Web", value: profile.app.local_web_url },
          { label: "Local API", value: profile.app.local_api_url },
          { label: "负责人", value: profile.app.owner_name },
          { label: "联系方式", value: profile.app.owner_contact },
        ]}
      />
    </section>
  );
}

function ComponentsSection({ rows }: { rows: SystemProfileComponent[] }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>系统组件</h3>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
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
              <EmptyRow colSpan={6} />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="system-profile-code">{row.component_code}</td>
                  <td>{row.component_type}</td>
                  <td>{row.name}</td>
                  <td>{row.description}</td>
                  <td>{boolText(row.is_required)}</td>
                  <td>
                    <StatusBadge active={row.is_active} />
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

function EnvironmentsSection({
  environments,
  appEnvironments,
}: {
  environments: SystemProfileEnvironment[];
  appEnvironments: SystemProfileAppEnvironment[];
}) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>环境</h3>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>名称</th>
              <th>说明</th>
              <th>应用显示名</th>
              <th>默认</th>
              <th>状态</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            {appEnvironments.length === 0 ? (
              <EmptyRow colSpan={7} />
            ) : (
              appEnvironments.map((row) => {
                const env = environments.find((item) => item.env_code === row.env_code);

                return (
                  <tr key={row.id}>
                    <td className="system-profile-code">{row.env_code}</td>
                    <td>{env?.name ?? "-"}</td>
                    <td>{env?.description ?? "-"}</td>
                    <td>{row.display_name}</td>
                    <td>{boolText(row.is_default)}</td>
                    <td>
                      <StatusBadge active={row.is_active} />
                    </td>
                    <td>{row.notes ?? "-"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EndpointsSection({ rows }: { rows: SystemProfileEndpoint[] }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>端点</h3>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>类型</th>
              <th>名称</th>
              <th>方法</th>
              <th>路径</th>
              <th>URL</th>
              <th>鉴权</th>
              <th>超时</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={9} />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.env_code}</td>
                  <td>{row.endpoint_type}</td>
                  <td>{row.name}</td>
                  <td>{row.method ?? "-"}</td>
                  <td className="system-profile-code">{row.path ?? "-"}</td>
                  <td className="system-profile-code">{row.url}</td>
                  <td>{boolText(row.auth_required)}</td>
                  <td>{row.timeout_ms} ms</td>
                  <td>
                    <StatusBadge active={row.is_active} />
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

function DatabasesSection({ rows }: { rows: SystemProfileDatabase[] }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>数据库元信息</h3>
      <p className="system-profile-muted">
        这里只登记数据库元信息、secret_ref 和健康检查策略，不保存密码，不保存完整连接串。
      </p>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>引擎</th>
              <th>Host Label</th>
              <th>端口</th>
              <th>库名</th>
              <th>Schema</th>
              <th>迁移</th>
              <th>Secret Ref</th>
              <th>访问策略</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={10} />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.env_code}</td>
                  <td>{row.db_engine}</td>
                  <td>{row.db_host_label}</td>
                  <td>{row.db_port}</td>
                  <td className="system-profile-code">{row.db_name}</td>
                  <td>{row.schema_name}</td>
                  <td>{row.migration_command ?? row.migration_tool ?? "-"}</td>
                  <td className="system-profile-code">{row.secret_ref ?? "-"}</td>
                  <td>{row.access_policy}</td>
                  <td>
                    <StatusBadge active={row.is_active} />
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

function RepositoriesSection({ rows }: { rows: SystemProfileRepository[] }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>仓库档案</h3>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>类型</th>
              <th>Provider</th>
              <th>Owner</th>
              <th>仓库</th>
              <th>分支</th>
              <th>本地路径</th>
              <th>CI</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.repo_type}</td>
                  <td>{row.provider}</td>
                  <td>{row.repo_owner}</td>
                  <td className="system-profile-code">{row.repo_name}</td>
                  <td>{row.default_branch}</td>
                  <td className="system-profile-code">{row.local_path ?? "-"}</td>
                  <td>{row.ci_workflow_name ?? "-"}</td>
                  <td>
                    <StatusBadge active={row.is_active} />
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

function GatewaySection({ rows }: { rows: SystemProfileGatewayBinding[] }) {
  return (
    <section className="system-profile-card system-profile-section">
      <h3>Gateway 绑定</h3>
      <p className="system-profile-muted">
        这里只展示 Gateway 合同和发布状态；当前页面不会自动生成或发布 Nginx 配置。
      </p>
      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>环境</th>
              <th>Web Path</th>
              <th>API Path</th>
              <th>Web Upstream</th>
              <th>API Upstream</th>
              <th>Rewrite</th>
              <th>发布</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={8} />
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.env_code}</td>
                  <td className="system-profile-code">{row.web_path}</td>
                  <td className="system-profile-code">{row.api_path}</td>
                  <td className="system-profile-code">{row.web_upstream_url ?? "-"}</td>
                  <td className="system-profile-code">{row.api_upstream_url ?? "-"}</td>
                  <td>{row.rewrite_mode}</td>
                  <td>
                    <PublishedBadge published={row.is_published} />
                  </td>
                  <td>
                    <StatusBadge active={row.is_active} />
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

function DependencyTable({
  rows,
  title,
  emptyColSpan,
}: {
  rows: SystemProfileDependency[];
  title: string;
  emptyColSpan: number;
}) {
  return (
    <div className="system-profile-table-wrap">
      <h3>{title}</h3>
      <table className="system-profile-table">
        <thead>
          <tr>
            <th>来源系统</th>
            <th>目标系统</th>
            <th>类型</th>
            <th>说明</th>
            <th>状态</th>
            <th>必需</th>
            <th>启用</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={emptyColSpan} />
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="system-profile-code">{row.source_app_code}</td>
                <td className="system-profile-code">{row.target_app_code}</td>
                <td>{row.dependency_type}</td>
                <td>{row.description}</td>
                <td>{row.status}</td>
                <td>{boolText(row.is_required)}</td>
                <td>
                  <StatusBadge active={row.is_active} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DependenciesSection({
  outgoing,
  incoming,
}: {
  outgoing: SystemProfileDependency[];
  incoming: SystemProfileDependency[];
}) {
  return (
    <section className="system-profile-card system-profile-section">
      <DependencyTable rows={outgoing} title="出站依赖" emptyColSpan={7} />
      <div className="system-profile-subsection">
        <DependencyTable rows={incoming} title="入站依赖" emptyColSpan={7} />
      </div>
    </section>
  );
}

function ServiceAuthSection({
  clients,
  permissions,
}: {
  clients: SystemProfileServiceClient[];
  permissions: SystemProfileServicePermission[];
}) {
  const clientLabelById = new Map(
    clients.map((client) => [client.id, client.client_code] as const),
  );

  return (
    <section className="system-profile-card system-profile-section">
      <h3>服务调用身份</h3>
      <p className="system-profile-muted">
        这里只展示服务调用身份和系统间权限档案；当前页面不会生成 token，也不会启用真实鉴权。
      </p>

      <div className="system-profile-table-wrap">
        <table className="system-profile-table">
          <thead>
            <tr>
              <th>Client Code</th>
              <th>Client Name</th>
              <th>所属系统</th>
              <th>Auth Type</th>
              <th>Secret Ref</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <EmptyRow colSpan={6} />
            ) : (
              clients.map((row) => (
                <tr key={row.id}>
                  <td className="system-profile-code">{row.client_code}</td>
                  <td>{row.client_name}</td>
                  <td className="system-profile-code">{row.app_code}</td>
                  <td>{row.auth_type}</td>
                  <td className="system-profile-code">{row.secret_ref ?? "-"}</td>
                  <td>
                    <StatusBadge active={row.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="system-profile-subsection">
        <h3>系统间权限档案</h3>
        <div className="system-profile-table-wrap">
          <table className="system-profile-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>来源系统</th>
                <th>目标系统</th>
                <th>权限码</th>
                <th>说明</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {permissions.length === 0 ? (
                <EmptyRow colSpan={6} />
              ) : (
                permissions.map((row) => (
                  <tr key={row.id}>
                    <td className="system-profile-code">
                      {clientLabelById.get(row.client_id) ?? `client#${row.client_id}`}
                    </td>
                    <td className="system-profile-code">{row.source_app_code}</td>
                    <td className="system-profile-code">{row.target_app_code}</td>
                    <td className="system-profile-code">{row.permission_code}</td>
                    <td>{row.description}</td>
                    <td>
                      <StatusBadge active={row.is_active} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function renderSection(section: SectionKey, profile: AppRegistrySystemProfile) {
  if (section === "overview") {
    return <OverviewSection profile={profile} />;
  }

  if (section === "components") {
    return <ComponentsSection rows={profile.components} />;
  }

  if (section === "environments") {
    return (
      <EnvironmentsSection
        environments={profile.environments}
        appEnvironments={profile.app_environments}
      />
    );
  }

  if (section === "endpoints") {
    return <EndpointsSection rows={profile.endpoints} />;
  }

  if (section === "databases") {
    return <DatabasesSection rows={profile.databases} />;
  }

  if (section === "repositories") {
    return <RepositoriesSection rows={profile.repositories} />;
  }

  if (section === "gateway") {
    return <GatewaySection rows={profile.gateway_bindings} />;
  }

  if (section === "dependencies") {
    return (
      <DependenciesSection
        outgoing={profile.outgoing_dependencies}
        incoming={profile.incoming_dependencies}
      />
    );
  }

  return (
    <ServiceAuthSection
      clients={profile.service_clients}
      permissions={profile.service_permissions}
    />
  );
}

export function SystemAppProfilePage() {
  const { appCode, section } = useParams();
  const { token } = useSessionRuntime();
  const activeSection = isSectionKey(section) ? section : "overview";
  const { profile, loading, error } = useSystemProfile(token, appCode);

  if (!appCode) {
    return <Navigate to="/system/apps" replace />;
  }

  if (section && !isSectionKey(section)) {
    return <Navigate to={`/system/apps/${appCode}/overview`} replace />;
  }

  return (
    <div className="system-profile-stack">
      <section className="system-profile-card system-profile-hero">
        <div>
          <div className="eyebrow">System Registry</div>
          <h2>{profile?.app.name ?? appCode}</h2>
          <p>{profile?.app.description ?? "正在加载系统档案。"}</p>
        </div>
        <div className="system-profile-actions">
          <Link className="system-profile-button" to="/system/apps">
            返回应用注册
          </Link>
        </div>
      </section>

      {error ? <div className="system-profile-alert danger">{error}</div> : null}
      {loading ? <div className="system-profile-alert">正在加载系统档案…</div> : null}

      {profile ? (
        <>
          <section className="system-profile-card">
            <div className="system-profile-hero">
              <div>
                <div className="eyebrow">{profile.app.code}</div>
                <h2>{profile.app.name}</h2>
                <p>{profile.app.description}</p>
              </div>
              <div className="system-profile-badges">
                <span className="system-profile-badge">{profile.app.domain_code}</span>
                <span className="system-profile-badge">{profile.app.app_type}</span>
                <span className="system-profile-badge">{profile.app.status}</span>
                <StatusBadge active={profile.app.is_active} />
              </div>
            </div>

            <nav className="system-profile-nav">
              {SECTIONS.map((item) => (
                <NavLink
                  key={item.key}
                  to={`/system/apps/${profile.app.code}/${item.key}`}
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                  end
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </section>

          {renderSection(activeSection, profile)}
        </>
      ) : null}
    </div>
  );
}
