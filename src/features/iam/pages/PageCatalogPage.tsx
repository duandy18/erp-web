import { useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import type { AppSelfDescriptionPageDTO } from "../../app-registry/contracts/selfDescription";
import { usePageCatalogPresenter } from "../page-catalog/hooks/usePageCatalogPresenter";
import { useSessionRuntime } from "../runtime/useSessionRuntime";

type ActiveFilter = "all" | "active" | "inactive";
type IssueFilter = "all" | "missing_route" | "missing_read" | "missing_write";

const EMPTY_PAGES: AppSelfDescriptionPageDTO[] = [];

function emptyText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
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

function BoolPill({ active }: { active: boolean }) {
  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? "启用" : "停用"}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function hasMissingRoute(page: AppSelfDescriptionPageDTO): boolean {
  return !page.route_path || page.route_path.trim() === "";
}

function hasMissingReadPermission(page: AppSelfDescriptionPageDTO): boolean {
  return !page.read_permission_code || page.read_permission_code.trim() === "";
}

function hasMissingWritePermission(page: AppSelfDescriptionPageDTO): boolean {
  return !page.write_permission_code || page.write_permission_code.trim() === "";
}

export function PageCatalogPage() {
  const { token, user } = useSessionRuntime();
  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const {
    apps,
    selectedApp,
    selectedAppCode,
    setSelectedAppCode,
    selfDescription,
    loading,
    error,
    reloadPageCatalog,
  } = usePageCatalogPresenter(token);

  const [keyword, setKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [issueFilter, setIssueFilter] = useState<IssueFilter>("all");

  const pages = selfDescription?.pages ?? EMPTY_PAGES;

  const pageNameByCode = useMemo(
    () => new Map(pages.map((page) => [page.page_code, page.page_name])),
    [pages],
  );

  const summary = useMemo(
    () => ({
      pageCount: pages.length,
      activePageCount: pages.filter((page) => page.is_active).length,
      level1Count: pages.filter((page) => page.level === 1).length,
      level2Count: pages.filter((page) => page.level === 2).length,
      level3Count: pages.filter((page) => page.level === 3).length,
      routeCount: pages.filter((page) => !hasMissingRoute(page)).length,
      missingRouteCount: pages.filter(hasMissingRoute).length,
      missingReadCount: pages.filter(hasMissingReadPermission).length,
      missingWriteCount: pages.filter(hasMissingWritePermission).length,
      latestSyncedAt:
        selfDescription?.latest_sync_run?.finished_at ??
        pages.find((page) => page.last_synced_at)?.last_synced_at ??
        null,
    }),
    [pages, selfDescription],
  );

  const filteredPages = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return pages.filter((page) => {
      if (activeFilter === "active" && !page.is_active) return false;
      if (activeFilter === "inactive" && page.is_active) return false;
      if (issueFilter === "missing_route" && !hasMissingRoute(page)) return false;
      if (issueFilter === "missing_read" && !hasMissingReadPermission(page)) return false;
      if (issueFilter === "missing_write" && !hasMissingWritePermission(page)) return false;

      if (!normalizedKeyword) return true;

      return [
        page.page_name,
        page.page_code,
        page.route_path ?? "",
        page.parent_page_code ?? "",
        page.read_permission_code ?? "",
        page.write_permission_code ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [activeFilter, issueFilter, keyword, pages]);

  if (!canRead) {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <div className="eyebrow">PAGE CATALOG</div>
          <h2>页面目录</h2>
          <p>当前账号无系统管理页面访问权限。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">PAGE CATALOG</div>
        <h2>页面目录</h2>
        <p>查看独立系统同步到 ERP 的页面目录，作为应用权限配置的事实来源。</p>
      </section>

      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载页面目录…</div> : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>目录汇总</h2>
            <p>
              当前系统：{selectedApp?.name ?? "暂无"}；最近同步：
              {formatDateTime(summary.latestSyncedAt)}
            </p>
          </div>

          <div className="admin-apps-toolbar">
            <select
              value={selectedAppCode}
              onChange={(event) => setSelectedAppCode(event.target.value)}
            >
              {apps.length === 0 ? <option value="">暂无可选系统</option> : null}
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
                void reloadPageCatalog();
              }}
            >
              刷新
            </button>
          </div>
        </div>

        <div className="admin-apps-profile-grid">
          <SummaryCard label="页面总数" value={summary.pageCount} />
          <SummaryCard label="启用页面" value={summary.activePageCount} />
          <SummaryCard label="一级页面" value={summary.level1Count} />
          <SummaryCard label="二级页面" value={summary.level2Count} />
          <SummaryCard label="三级页面" value={summary.level3Count} />
          <SummaryCard label="有路由" value={summary.routeCount} />
          <SummaryCard label="缺路由" value={summary.missingRouteCount} />
          <SummaryCard label="缺读权限" value={summary.missingReadCount} />
          <SummaryCard label="缺写权限" value={summary.missingWriteCount} />
        </div>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>筛选</h2>
            <p>按页面名称、编码、路由和权限编码检索页面目录。</p>
          </div>

          <div className="admin-apps-toolbar">
            <input
              placeholder="搜索页面 / 路由 / 权限"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
            >
              <option value="all">全部启停</option>
              <option value="active">仅启用</option>
              <option value="inactive">仅停用</option>
            </select>

            <select
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.target.value as IssueFilter)}
            >
              <option value="all">全部问题</option>
              <option value="missing_route">缺路由</option>
              <option value="missing_read">缺读权限</option>
              <option value="missing_write">缺写权限</option>
            </select>
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
                <th>同步时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => {
                const parentPageName = page.parent_page_code
                  ? pageNameByCode.get(page.parent_page_code) ?? page.parent_page_code
                  : null;

                return (
                  <tr key={page.page_code}>
                    <td>
                      <div>{page.page_name}</div>
                      <div className="admin-apps-code">{page.page_code}</div>
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
                    <td>{formatDateTime(page.last_synced_at)}</td>
                  </tr>
                );
              })}

              {filteredPages.length === 0 ? (
                <tr>
                  <td className="admin-apps-empty-cell" colSpan={9}>
                    暂无符合条件的页面
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
