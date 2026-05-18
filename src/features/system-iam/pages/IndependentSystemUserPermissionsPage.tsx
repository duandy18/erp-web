import { useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  SystemIamAppDTO,
  SystemIamPageDTO,
  SystemIamPageRoutePrefixDTO,
  SystemIamPermissionDTO,
  SystemIamSyncRunDTO,
  SystemIamUserDTO,
  SystemIamUserPermissionDTO,
} from "../contracts/systemIam";
import { useIndependentSystemUserPermissions } from "../hooks/useIndependentSystemUserPermissions";

type ActiveSection = "users" | "permissions" | "user_permissions" | "pages" | "routes";

type CountByKey = Record<string, number>;

const SECTION_LABELS: Record<ActiveSection, string> = {
  pages: "页面权限",
  permissions: "权限字典",
  routes: "路由归属",
  user_permissions: "用户权限关系",
  users: "用户",
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

function emptyText(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  return String(value);
}

function buildAppNameMap(apps: SystemIamAppDTO[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const app of apps) {
    map[app.app_code] = app.app_name;
  }

  return map;
}

function latestRunByApp(runs: SystemIamSyncRunDTO[]): Record<string, SystemIamSyncRunDTO> {
  const map: Record<string, SystemIamSyncRunDTO> = {};

  for (const run of runs) {
    const existing = map[run.app_code];
    if (!existing || run.id > existing.id) {
      map[run.app_code] = run;
    }
  }

  return map;
}

function userKey(appCode: string, sourceUserId: number): string {
  return `${appCode}:${sourceUserId}`;
}

function countUserPermissions(userPermissions: SystemIamUserPermissionDTO[]): CountByKey {
  const counts: CountByKey = {};

  for (const item of userPermissions) {
    const key = userKey(item.app_code, item.source_user_id);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function countRoutesByPage(routes: SystemIamPageRoutePrefixDTO[]): CountByKey {
  const counts: CountByKey = {};

  for (const item of routes) {
    const key = `${item.app_code}:${item.page_code}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

function buildUserNameMap(users: SystemIamUserDTO[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const user of users) {
    map[userKey(user.app_code, user.source_user_id)] = user.username;
  }

  return map;
}

function matchesKeyword(values: Array<string | number | boolean | null | undefined>, keyword: string): boolean {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return values
    .map((value) => emptyText(value))
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function filterByApp<T extends { app_code: string }>(items: T[], appCode: string): T[] {
  if (!appCode) {
    return items;
  }

  return items.filter((item) => item.app_code === appCode);
}

function StatusPill({ active }: { active: boolean | null }) {
  if (active === null) {
    return <span className="admin-apps-status muted">未知</span>;
  }

  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? "启用" : "停用"}
    </span>
  );
}

function SyncStatusPill({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <span className="admin-apps-status muted">未同步</span>;
  }

  return (
    <span className={status === "success" ? "admin-apps-status success" : "admin-apps-status muted"}>
      {status === "success" ? "成功" : status}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SystemIamSummary({
  apps,
  users,
  permissions,
  userPermissions,
  pages,
  routes,
  runs,
}: {
  apps: SystemIamAppDTO[];
  users: SystemIamUserDTO[];
  permissions: SystemIamPermissionDTO[];
  userPermissions: SystemIamUserPermissionDTO[];
  pages: SystemIamPageDTO[];
  routes: SystemIamPageRoutePrefixDTO[];
  runs: SystemIamSyncRunDTO[];
}) {
  const successRuns = runs.filter((run) => run.status === "success").length;

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <SummaryCard label="系统" value={apps.length} />
        <SummaryCard label="用户" value={users.length} />
        <SummaryCard label="权限" value={permissions.length} />
        <SummaryCard label="用户权限关系" value={userPermissions.length} />
        <SummaryCard label="页面" value={pages.length} />
        <SummaryCard label="路由" value={routes.length} />
        <SummaryCard label="最近同步成功" value={successRuns} />
      </div>
    </section>
  );
}

function SyncRunsPanel({
  apps,
  latestRuns,
  loading,
  syncingAppCode,
  canManage,
  onSync,
  onRefresh,
}: {
  apps: SystemIamAppDTO[];
  latestRuns: Record<string, SystemIamSyncRunDTO>;
  loading: boolean;
  syncingAppCode: string | null;
  canManage: boolean;
  onSync: (appCode: string) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>同步状态</h2>
          <p>从各独立系统读取 /system/read/v1/iam-snapshot，写入 ERP 本地 projection。</p>
        </div>
        <div className="admin-apps-row-actions">
          <button
            type="button"
            className="admin-apps-button secondary"
            disabled={loading || syncingAppCode !== null}
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
              <th>系统</th>
              <th>最近状态</th>
              <th>拉取 / 写入</th>
              <th>时间</th>
              <th>错误</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => {
              const run = latestRuns[app.app_code];
              const syncing = syncingAppCode === app.app_code;

              return (
                <tr key={app.app_code}>
                  <td>
                    <div className="admin-apps-code">{app.app_code}</div>
                    <div>{app.app_name}</div>
                    <div className="admin-apps-muted">{app.app_type}</div>
                  </td>
                  <td>
                    <SyncStatusPill status={run?.status} />
                  </td>
                  <td>
                    {run ? (
                      <>
                        <div>fetched：{run.fetched_count}</div>
                        <div className="admin-apps-muted">
                          inserted {run.inserted_count} / updated {run.updated_count} / deleted{" "}
                          {run.deleted_count}
                        </div>
                      </>
                    ) : (
                      <span className="admin-apps-muted">暂无同步记录</span>
                    )}
                  </td>
                  <td>
                    <div>开始：{formatDateTime(run?.started_at)}</div>
                    <div className="admin-apps-muted">完成：{formatDateTime(run?.finished_at)}</div>
                  </td>
                  <td>
                    <div className="admin-apps-muted">{emptyText(run?.error_message)}</div>
                    {run?.raw_excerpt ? (
                      <div className="admin-apps-muted">{run.raw_excerpt}</div>
                    ) : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-apps-button secondary"
                      disabled={!canManage || loading || syncingAppCode !== null}
                      onClick={() => onSync(app.app_code)}
                    >
                      {syncing ? "同步中…" : "同步"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UsersTable({
  users,
  appNameMap,
  permissionCounts,
}: {
  users: SystemIamUserDTO[];
  appNameMap: Record<string, string>;
  permissionCounts: CountByKey;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>用户</h2>
          <p>只读展示各独立系统自己的用户表投影；ERP 不执行目标系统权限校验。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>系统</th>
              <th>用户</th>
              <th>状态</th>
              <th>联系方式</th>
              <th>权限数</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6}>暂无用户投影数据</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={`${user.app_code}-${user.source_user_id}`}>
                  <td>
                    <div className="admin-apps-code">{user.app_code}</div>
                    <div>{appNameMap[user.app_code] ?? user.app_code}</div>
                  </td>
                  <td>
                    <div className="admin-apps-code">#{user.source_user_id}</div>
                    <div>{user.username}</div>
                    <div className="admin-apps-muted">{emptyText(user.full_name)}</div>
                  </td>
                  <td>
                    <StatusPill active={user.is_active} />
                  </td>
                  <td>
                    <div>{emptyText(user.phone)}</div>
                    <div className="admin-apps-muted">{emptyText(user.email)}</div>
                  </td>
                  <td>{permissionCounts[userKey(user.app_code, user.source_user_id)] ?? 0}</td>
                  <td>{formatDateTime(user.last_synced_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PermissionsTable({
  permissions,
  appNameMap,
}: {
  permissions: SystemIamPermissionDTO[];
  appNameMap: Record<string, string>;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>权限字典</h2>
          <p>来自目标系统 permissions 表或页面权限字典。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>系统</th>
              <th>源权限 ID</th>
              <th>权限编码</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={4}>暂无权限投影数据</td>
              </tr>
            ) : (
              permissions.map((permission) => (
                <tr key={`${permission.app_code}-${permission.permission_code}`}>
                  <td>
                    <div className="admin-apps-code">{permission.app_code}</div>
                    <div>{appNameMap[permission.app_code] ?? permission.app_code}</div>
                  </td>
                  <td>{permission.source_permission_id}</td>
                  <td className="admin-apps-code">{permission.permission_code}</td>
                  <td>{formatDateTime(permission.last_synced_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserPermissionsTable({
  userPermissions,
  userNameMap,
}: {
  userPermissions: SystemIamUserPermissionDTO[];
  userNameMap: Record<string, string>;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>用户权限关系</h2>
          <p>按 app_code + source_user_id + permission_code 展示目标系统授权关系。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>系统</th>
              <th>用户</th>
              <th>权限</th>
              <th>授权时间</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {userPermissions.length === 0 ? (
              <tr>
                <td colSpan={5}>暂无用户权限关系投影数据</td>
              </tr>
            ) : (
              userPermissions.map((item) => (
                <tr key={`${item.app_code}-${item.source_user_id}-${item.permission_code}`}>
                  <td className="admin-apps-code">{item.app_code}</td>
                  <td>
                    <div className="admin-apps-code">#{item.source_user_id}</div>
                    <div>{userNameMap[userKey(item.app_code, item.source_user_id)] ?? "-"}</div>
                  </td>
                  <td>
                    <div className="admin-apps-code">{item.permission_code}</div>
                    <div className="admin-apps-muted">source permission #{item.source_permission_id}</div>
                  </td>
                  <td>{formatDateTime(item.granted_at)}</td>
                  <td>{formatDateTime(item.last_synced_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PagesTable({
  pages,
  routeCounts,
}: {
  pages: SystemIamPageDTO[];
  routeCounts: CountByKey;
}) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>页面权限</h2>
          <p>展示目标系统页面注册、读写权限编码和继承状态。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>系统</th>
              <th>页面</th>
              <th>层级 / 父级</th>
              <th>读写权限</th>
              <th>导航</th>
              <th>状态</th>
              <th>路由数</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={7}>暂无页面权限投影数据</td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={`${page.app_code}-${page.page_code}`}>
                  <td className="admin-apps-code">{page.app_code}</td>
                  <td>
                    <div>{page.page_name}</div>
                    <div className="admin-apps-code">{page.page_code}</div>
                    <div className="admin-apps-muted">domain: {emptyText(page.domain_code)}</div>
                  </td>
                  <td>
                    <div>level {page.level}</div>
                    <div className="admin-apps-muted">parent: {emptyText(page.parent_page_code)}</div>
                    <div className="admin-apps-muted">sort: {emptyText(page.sort_order)}</div>
                  </td>
                  <td>
                    <div>读：{emptyText(page.read_permission_code)}</div>
                    <div className="admin-apps-muted">写：{emptyText(page.write_permission_code)}</div>
                  </td>
                  <td>
                    <div>topbar：{emptyText(page.show_in_topbar)}</div>
                    <div>sidebar：{emptyText(page.show_in_sidebar)}</div>
                    <div className="admin-apps-muted">
                      继承权限：{emptyText(page.inherit_permissions)}
                    </div>
                  </td>
                  <td>
                    <StatusPill active={page.is_active} />
                  </td>
                  <td>{routeCounts[`${page.app_code}:${page.page_code}`] ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoutesTable({ routes }: { routes: SystemIamPageRoutePrefixDTO[] }) {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>路由归属</h2>
          <p>展示各目标系统 page_route_prefixes 到页面编码的映射。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>系统</th>
              <th>页面编码</th>
              <th>路由前缀</th>
              <th>排序</th>
              <th>状态</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {routes.length === 0 ? (
              <tr>
                <td colSpan={6}>暂无路由投影数据</td>
              </tr>
            ) : (
              routes.map((route) => (
                <tr key={`${route.app_code}-${route.page_code}-${route.route_prefix}`}>
                  <td className="admin-apps-code">{route.app_code}</td>
                  <td className="admin-apps-code">{route.page_code}</td>
                  <td>{route.route_prefix}</td>
                  <td>{emptyText(route.sort_order)}</td>
                  <td>
                    <StatusPill active={route.is_active} />
                  </td>
                  <td>{formatDateTime(route.last_synced_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function IndependentSystemUserPermissionsPage() {
  const { token, user } = useSessionRuntime();
  const [selectedAppCode, setSelectedAppCode] = useState("");
  const [keyword, setKeyword] = useState("");
  const [activeSection, setActiveSection] = useState<ActiveSection>("users");

  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    data,
    loading,
    syncingAppCode,
    error,
    message,
    latestManualRun,
    reload,
    syncApp,
  } = useIndependentSystemUserPermissions(token);

  const appNameMap = useMemo(() => buildAppNameMap(data.apps), [data.apps]);
  const latestRuns = useMemo(() => latestRunByApp(data.latest_sync_runs), [data.latest_sync_runs]);

  const appFilteredUsers = useMemo(
    () => filterByApp(data.users, selectedAppCode),
    [data.users, selectedAppCode],
  );
  const appFilteredPermissions = useMemo(
    () => filterByApp(data.permissions, selectedAppCode),
    [data.permissions, selectedAppCode],
  );
  const appFilteredUserPermissions = useMemo(
    () => filterByApp(data.user_permissions, selectedAppCode),
    [data.user_permissions, selectedAppCode],
  );
  const appFilteredPages = useMemo(
    () => filterByApp(data.page_registry, selectedAppCode),
    [data.page_registry, selectedAppCode],
  );
  const appFilteredRoutes = useMemo(
    () => filterByApp(data.page_route_prefixes, selectedAppCode),
    [data.page_route_prefixes, selectedAppCode],
  );

  const userNameMap = useMemo(() => buildUserNameMap(data.users), [data.users]);
  const permissionCounts = useMemo(
    () => countUserPermissions(data.user_permissions),
    [data.user_permissions],
  );
  const routeCounts = useMemo(
    () => countRoutesByPage(data.page_route_prefixes),
    [data.page_route_prefixes],
  );

  const users = useMemo(
    () =>
      appFilteredUsers.filter((item) =>
        matchesKeyword(
          [
            item.app_code,
            item.source_user_id,
            item.username,
            item.full_name,
            item.phone,
            item.email,
            item.is_active,
          ],
          keyword,
        ),
      ),
    [appFilteredUsers, keyword],
  );

  const permissions = useMemo(
    () =>
      appFilteredPermissions.filter((item) =>
        matchesKeyword(
          [item.app_code, item.source_permission_id, item.permission_code],
          keyword,
        ),
      ),
    [appFilteredPermissions, keyword],
  );

  const userPermissions = useMemo(
    () =>
      appFilteredUserPermissions.filter((item) =>
        matchesKeyword(
          [
            item.app_code,
            item.source_user_id,
            userNameMap[userKey(item.app_code, item.source_user_id)],
            item.source_permission_id,
            item.permission_code,
          ],
          keyword,
        ),
      ),
    [appFilteredUserPermissions, keyword, userNameMap],
  );

  const pages = useMemo(
    () =>
      appFilteredPages.filter((item) =>
        matchesKeyword(
          [
            item.app_code,
            item.page_code,
            item.page_name,
            item.parent_page_code,
            item.domain_code,
            item.read_permission_code,
            item.write_permission_code,
          ],
          keyword,
        ),
      ),
    [appFilteredPages, keyword],
  );

  const routes = useMemo(
    () =>
      appFilteredRoutes.filter((item) =>
        matchesKeyword([item.app_code, item.page_code, item.route_prefix], keyword),
      ),
    [appFilteredRoutes, keyword],
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

  const sectionCounts: Record<ActiveSection, number> = {
    pages: pages.length,
    permissions: permissions.length,
    routes: routes.length,
    user_permissions: userPermissions.length,
    users: users.length,
  };

  const selectedAppName = selectedAppCode ? appNameMap[selectedAppCode] ?? selectedAppCode : "全部系统";

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {message ? <div className="admin-apps-alert">{message}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载独立系统用户权限表…</div> : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>独立系统用户权限表</h2>
            <p>
              当前查看：{selectedAppName}。这里只读展示 ERP projection，同步操作只读取目标系统，
              不改目标系统用户权限。
            </p>
            {latestManualRun ? (
              <p className="admin-apps-muted">
                最近手动同步：{latestManualRun.app_code} · {latestManualRun.status} · fetched{" "}
                {latestManualRun.fetched_count}
              </p>
            ) : null}
          </div>
          <div className="admin-apps-toolbar">
            <select
              value={selectedAppCode}
              onChange={(event) => setSelectedAppCode(event.target.value)}
            >
              <option value="">全部系统</option>
              {data.apps.map((app) => (
                <option key={app.app_code} value={app.app_code}>
                  {app.app_code} · {app.app_name}
                </option>
              ))}
            </select>
            <input
              placeholder="搜索用户 / 权限 / 页面 / 路由"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <button
              type="button"
              className="admin-apps-button secondary"
              disabled={loading || syncingAppCode !== null}
              onClick={() => {
                void reload();
              }}
            >
              刷新
            </button>
            <button
              type="button"
              className="admin-apps-button primary"
              disabled={!canManage || !selectedAppCode || loading || syncingAppCode !== null}
              onClick={() => {
                void syncApp(selectedAppCode);
              }}
            >
              {syncingAppCode === selectedAppCode ? "同步中…" : "同步当前系统"}
            </button>
          </div>
        </div>
      </section>

      <SystemIamSummary
        apps={filterByApp(data.apps, selectedAppCode)}
        users={appFilteredUsers}
        permissions={appFilteredPermissions}
        userPermissions={appFilteredUserPermissions}
        pages={appFilteredPages}
        routes={appFilteredRoutes}
        runs={filterByApp(data.latest_sync_runs, selectedAppCode)}
      />

      <SyncRunsPanel
        apps={filterByApp(data.apps, selectedAppCode)}
        latestRuns={latestRuns}
        loading={loading}
        syncingAppCode={syncingAppCode}
        canManage={canManage}
        onSync={(appCode) => {
          void syncApp(appCode);
        }}
        onRefresh={() => {
          void reload();
        }}
      />

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>数据区块</h2>
            <p>按用户、权限、用户权限关系、页面权限和路由归属查看 projection 明细。</p>
          </div>
          <div className="admin-apps-row-actions">
            {(Object.keys(SECTION_LABELS) as ActiveSection[]).map((section) => (
              <button
                key={section}
                type="button"
                className={
                  activeSection === section
                    ? "admin-apps-button primary"
                    : "admin-apps-button secondary"
                }
                onClick={() => setActiveSection(section)}
              >
                {SECTION_LABELS[section]}（{sectionCounts[section]}）
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeSection === "users" ? (
        <UsersTable users={users} appNameMap={appNameMap} permissionCounts={permissionCounts} />
      ) : null}

      {activeSection === "permissions" ? (
        <PermissionsTable permissions={permissions} appNameMap={appNameMap} />
      ) : null}

      {activeSection === "user_permissions" ? (
        <UserPermissionsTable userPermissions={userPermissions} userNameMap={userNameMap} />
      ) : null}

      {activeSection === "pages" ? (
        <PagesTable pages={pages} routeCounts={routeCounts} />
      ) : null}

      {activeSection === "routes" ? <RoutesTable routes={routes} /> : null}
    </div>
  );
}
