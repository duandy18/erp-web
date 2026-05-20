import type { ReactNode } from "react";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  AppSelfDescriptionDTO,
  AppSelfDescriptionEndpointDTO,
  AppSelfDescriptionManifestDTO,
  AppSelfDescriptionPageDTO,
  AppSelfDescriptionSyncRunDTO,
} from "../contracts/selfDescription";
import { useAppSelfDescriptionCatalog } from "../hooks/useAppSelfDescriptionCatalog";

type CatalogActionsProps = {
  apps: Array<{ code: string; name: string }>;
  selectedAppCode: string;
  loading: boolean;
  onSelectAppCode: (code: string) => void;
  onRefresh: () => void;
};

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

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{emptyText(value)}</strong>
    </article>
  );
}

function CatalogActions({
  apps,
  selectedAppCode,
  loading,
  onSelectAppCode,
  onRefresh,
}: CatalogActionsProps) {
  return (
    <div className="admin-apps-toolbar">
      <select value={selectedAppCode} onChange={(event) => onSelectAppCode(event.target.value)}>
        {apps.length === 0 ? <option value="">暂无可选业务系统</option> : null}
        {apps.map((app) => (
          <option key={app.code} value={app.code}>
            {app.name}（{app.code}）
          </option>
        ))}
      </select>

      <button
        type="button"
        className="admin-apps-button secondary"
        disabled={!selectedAppCode || loading}
        onClick={() => {
          onRefresh();
        }}
      >
        刷新
      </button>
    </div>
  );
}

function EndpointTable({
  title,
  description,
  endpoints,
}: {
  title: string;
  description: string;
  endpoints: AppSelfDescriptionEndpointDTO[];
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <div className="admin-apps-alert">暂无端点声明。</div>
      ) : (
        <div className="admin-apps-table-wrap">
          <table className="admin-apps-table">
            <thead>
              <tr>
                <th>端点</th>
                <th>方法</th>
                <th>路径</th>
                <th>用途</th>
                <th>认证策略</th>
                <th>必需</th>
                <th>启用</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={`${endpoint.code}-${endpoint.method}-${endpoint.path}`}>
                  <td>
                    <div>{endpoint.code}</div>
                  </td>
                  <td>{endpoint.method}</td>
                  <td>{endpoint.path}</td>
                  <td>{emptyText(endpoint.purpose)}</td>
                  <td>{endpoint.auth_policy}</td>
                  <td>
                    <BoolPill active={endpoint.is_required} />
                  </td>
                  <td>
                    <BoolPill active={endpoint.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ManifestSummary({
  manifest,
  actions,
}: {
  manifest: AppSelfDescriptionManifestDTO | null;
  actions: ReactNode;
}) {
  if (!manifest) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>暂无 Manifest V2</h2>
            <p>当前系统还没有同步应用自描述。请先在“独立系统列表”中执行“同步自描述”。</p>
          </div>
          {actions}
        </div>
      </section>
    );
  }

  const { app, deployment, service_identity, security, build } = manifest;

  return (
    <>
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>{app.app_name}</h2>
            <p>{app.description}</p>
          </div>
          {actions}
        </div>

        <div className="admin-apps-profile-grid">
          <InfoCard label="合同版本" value={manifest.manifest_contract_version} />
          <InfoCard label="生成时间" value={formatDateTime(manifest.generated_at)} />
          <InfoCard label="最近同步" value={formatDateTime(manifest.last_synced_at)} />
          <InfoCard label="系统编码" value={app.app_code} />
          <InfoCard label="系统类型" value={app.app_type} />
          <InfoCard label="所属域" value={app.owner_domain} />
          <InfoCard label="系统状态" value={app.status} />
          <InfoCard label="部署环境" value={deployment.env_code} />
          <InfoCard label="部署模式" value={deployment.deployment_mode} />
          <InfoCard label="Web 入口路径" value={deployment.web_path} />
          <InfoCard label="API 入口路径" value={deployment.api_path} />
          <InfoCard label="控制面地址" value={deployment.control_base_url} />
          <InfoCard label="内部 API 地址" value={deployment.internal_api_base_url} />
          <InfoCard label="公共 Web 地址" value={deployment.public_web_url} />
          <InfoCard label="公共 API 地址" value={deployment.public_api_base_url} />
          <InfoCard label="系统身份" value={service_identity.service_client_code} />
          <InfoCard label="身份 Header" value={service_identity.service_client_header} />
          <InfoCard label="自描述认证" value={security.self_description_auth_policy} />
          <InfoCard label="写入认证" value={security.write_auth_policy} />
          <InfoCard label="写入调用方" value={security.required_write_caller} />
          <InfoCard label="应用版本" value={build.app_version} />
          <InfoCard label="Git SHA" value={build.git_sha} />
          <InfoCard label="镜像标签" value={build.image_tag} />
          <InfoCard label="构建时间" value={formatDateTime(build.build_time)} />
        </div>
      </section>

      <EndpointTable
        title="控制面端点"
        description="来自 Manifest V2 的只读控制面端点声明，用于同步自描述、健康检查和合同读取。"
        endpoints={manifest.control_endpoints}
      />

      <EndpointTable
        title="写入端点"
        description="来自 Manifest V2 的写入端点声明，只展示合同，不在此页面执行写入。"
        endpoints={manifest.write_endpoints}
      />
    </>
  );
}

function LatestSyncRunSummary({
  latestSyncRun,
}: {
  latestSyncRun: AppSelfDescriptionSyncRunDTO | null;
}) {
  if (!latestSyncRun) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>暂无同步记录</h2>
            <p>该系统还没有自描述同步记录。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>最近同步记录</h2>
          <p>
            状态：{latestSyncRun.status}；读取 {latestSyncRun.fetched_count}； 新增{" "}
            {latestSyncRun.inserted_count}；更新 {latestSyncRun.updated_count}； 删除{" "}
            {latestSyncRun.deleted_count}；完成时间 {formatDateTime(latestSyncRun.finished_at)}
          </p>
        </div>
      </div>
    </section>
  );
}

function PageCatalogTable({ pages }: { pages: AppSelfDescriptionPageDTO[] }) {
  if (pages.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>页面目录</h2>
            <p>当前系统没有同步到前端页面目录数据。</p>
          </div>
        </div>
      </section>
    );
  }

  const pageNameByCode = new Map(pages.map((page) => [page.page_code, page.page_name]));

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>页面目录</h2>
          <p>只展示前端页面目录；系统能力和依赖治理信息请到“系统协作配置”查看。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>页面</th>
              <th>路由</th>
              <th>上级页面</th>
              <th>层级</th>
              <th>读权限</th>
              <th>写权限</th>
              <th>启用</th>
              <th>排序</th>
              <th>源更新时间</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const parentPageName = page.parent_page_code
                ? pageNameByCode.get(page.parent_page_code) ?? page.parent_page_code
                : null;

              return (
                <tr key={page.page_code}>
                  <td>
                    <div>{page.page_name}</div>
                    <div className="admin-apps-code">页面标识：{page.page_code}</div>
                  </td>
                  <td>{emptyText(page.route_path)}</td>
                  <td>{emptyText(parentPageName)}</td>
                  <td>第 {page.level} 级</td>
                  <td>{emptyText(page.read_permission_code)}</td>
                  <td>{emptyText(page.write_permission_code)}</td>
                  <td>
                    <BoolPill active={page.is_active} />
                  </td>
                  <td>{page.sort_order}</td>
                  <td>{formatDateTime(page.source_updated_at)}</td>
                  <td>{formatDateTime(page.last_synced_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PageCatalogContent({
  selfDescription,
  actions,
}: {
  selfDescription: AppSelfDescriptionDTO | null;
  actions: ReactNode;
}) {
  if (!selfDescription) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>暂无前端页面目录</h2>
            <p>请选择已同步自描述的业务系统。没有数据时，先回到“独立系统列表”执行“同步自描述”。</p>
          </div>
          {actions}
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      <ManifestSummary actions={actions} manifest={selfDescription.manifest} />
      <LatestSyncRunSummary latestSyncRun={selfDescription.latest_sync_run} />
      <PageCatalogTable pages={selfDescription.pages} />
    </div>
  );
}

export function SystemAppsFrontendPagesPanel() {
  const { token, user } = useSessionRuntime();
  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const {
    apps,
    selectedAppCode,
    setSelectedAppCode,
    selfDescription,
    loading,
    error,
    reloadSelfDescription,
  } = useAppSelfDescriptionCatalog(token);

  const actions = (
    <CatalogActions
      apps={apps}
      loading={loading}
      selectedAppCode={selectedAppCode}
      onRefresh={() => {
        void reloadSelfDescription();
      }}
      onSelectAppCode={setSelectedAppCode}
    />
  );

  if (!canRead) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>无访问权限</h2>
            <p>当前账号无系统管理页面访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载前端页面目录…</div> : null}

      <PageCatalogContent actions={actions} selfDescription={selfDescription} />
    </div>
  );
}
