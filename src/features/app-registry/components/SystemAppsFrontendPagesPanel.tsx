import type { ReactNode } from "react";

import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  AppSelfDescriptionDTO,
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
            {app.code} · {app.name}
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
            <h2>暂无 Manifest</h2>
            <p>当前系统还没有同步 manifest。请先在“独立系统列表”中执行“同步自描述”。</p>
          </div>
          {actions}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>{manifest.app_name}</h2>
          <p>{manifest.description}</p>
        </div>
        {actions}
      </div>

      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>系统编码</span>
          <strong>{manifest.app_code}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>系统类型 / 状态</span>
          <strong>
            {manifest.app_type} / {manifest.status}
          </strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>默认入口</span>
          <strong>{manifest.default_web_path}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>默认 API</span>
          <strong>{manifest.default_api_path}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>本地 API</span>
          <strong>{manifest.local_api_url}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>最近同步</span>
          <strong>{formatDateTime(manifest.last_synced_at)}</strong>
        </article>
      </div>
    </section>
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
            <p>该系统还没有 self-description 同步记录。</p>
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
            <p>当前系统没有同步到 page catalog 页面数据。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>页面目录</h2>
          <p>只展示 page catalog，不展示 service capabilities / dependencies 的治理信息。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>页面</th>
              <th>路由</th>
              <th>父页面</th>
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
            {pages.map((page) => (
              <tr key={page.page_code}>
                <td>
                  <div className="admin-apps-code">{page.page_code}</div>
                  <div>{page.page_name}</div>
                </td>
                <td>{emptyText(page.route_path)}</td>
                <td>{emptyText(page.parent_page_code)}</td>
                <td>{page.level}</td>
                <td>{emptyText(page.read_permission_code)}</td>
                <td>{emptyText(page.write_permission_code)}</td>
                <td>
                  <BoolPill active={page.is_active} />
                </td>
                <td>{page.sort_order}</td>
                <td>{formatDateTime(page.source_updated_at)}</td>
                <td>{formatDateTime(page.last_synced_at)}</td>
              </tr>
            ))}
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
