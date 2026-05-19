import { useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import "../admin-users/adminUsers.css";
import { useAppPermissionsPresenter } from "../app-permissions/hooks/useAppPermissionsPresenter";
import { useSessionRuntime } from "../runtime/useSessionRuntime";

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

function statusLabel(value: string | null | undefined): string {
  if (!value) return "暂无";
  if (value === "success") return "成功";
  if (value === "failure") return "失败";
  return value;
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function AppPermissionsPage() {
  const { token, user } = useSessionRuntime();
  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const presenter = useAppPermissionsPresenter(token);
  const {
    accessDraft,
    applySelectedApp,
    error,
    loading,
    matrix,
    message,
    permissionDraft,
    reload,
    runningAction,
    saveSelectedUser,
    selectedApp,
    selectedAppCode,
    selectedUser,
    setAppAccess,
    setPermission,
    setSelectedAppCode,
    setWritePermission,
    verifySelectedApp,
    selectUser,
  } = presenter;

  const [keyword, setKeyword] = useState("");

  const filteredUsers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return matrix.users;
    }

    return matrix.users.filter((item) =>
      [item.username, item.full_name ?? "", item.phone ?? "", item.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [keyword, matrix.users]);

  const selectedAppPages = useMemo(
    () => matrix.app_pages.filter((page) => page.app_code === selectedAppCode),
    [matrix.app_pages, selectedAppCode],
  );

  const selectedStatus = useMemo(
    () => matrix.write_status.items.find((item) => item.app_code === selectedAppCode) ?? null,
    [matrix.write_status.items, selectedAppCode],
  );

  if (!canRead) {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <div className="eyebrow">APP IAM</div>
          <h2>应用权限</h2>
          <p>当前账号无系统管理页面访问权限。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">APP IAM</div>
        <h2>应用权限</h2>
        <p>配置用户可访问的 App，以及每个 App 下页面读写权限；保存后再手动下发和验证。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-profile-grid">
          <SummaryCard label="用户" value={matrix.summary.user_count} />
          <SummaryCard label="应用" value={matrix.summary.app_count} />
          <SummaryCard label="页面" value={matrix.summary.app_page_count} />
          <SummaryCard label="App 访问" value={matrix.summary.access_count} />
          <SummaryCard label="权限" value={matrix.summary.permission_count} />
          <SummaryCard label="验证成功" value={matrix.summary.latest_verify_success_count} />
        </div>
      </section>

      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {message ? <div className="admin-apps-alert">{message}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载应用权限矩阵…</div> : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>操作区</h2>
            <p>保存配置只写 ERP desired state；下发和验证才访问目标系统。</p>
          </div>
          <div className="admin-apps-row-actions">
            <button
              className="admin-apps-button secondary"
              disabled={loading || runningAction !== null}
              type="button"
              onClick={() => {
                void reload();
              }}
            >
              刷新
            </button>
            <button
              className="admin-apps-button primary"
              disabled={!canManage || selectedUser === null || runningAction !== null}
              type="button"
              onClick={() => {
                void saveSelectedUser();
              }}
            >
              {runningAction === "save" ? "保存中…" : "保存配置"}
            </button>
            <button
              className="admin-apps-button secondary"
              disabled={!canManage || !selectedAppCode || runningAction !== null}
              type="button"
              onClick={() => {
                void applySelectedApp();
              }}
            >
              {runningAction === "apply" ? "下发中…" : "下发到应用"}
            </button>
            <button
              className="admin-apps-button secondary"
              disabled={!canManage || !selectedAppCode || runningAction !== null}
              type="button"
              onClick={() => {
                void verifySelectedApp();
              }}
            >
              {runningAction === "verify" ? "验证中…" : "验证应用"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "1fr 1fr 2fr", gap: 24 }}>
        <article className="admin-apps-card">
          <div className="admin-apps-table-header">
            <div>
              <h2>用户列表</h2>
              <p>选择要配置应用权限的用户。</p>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            <input
              placeholder="搜索用户"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <div className="admin-apps-table-wrap">
            <table className="admin-apps-table" style={{ minWidth: 380 }}>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.user_id}>
                    <td>
                      <button
                        className={
                          selectedUser?.user_id === item.user_id
                            ? "admin-apps-button primary"
                            : "admin-apps-button secondary"
                        }
                        type="button"
                        onClick={() => selectUser(item.user_id)}
                      >
                        {item.username}
                      </button>
                      <div className="admin-apps-muted">{emptyText(item.full_name)}</div>
                      <div className="admin-apps-muted">
                        {item.is_active ? "启用" : "停用"} · user #{item.user_id}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 ? (
                  <tr>
                    <td className="admin-apps-empty-cell">暂无用户</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-apps-card">
          <div className="admin-apps-table-header">
            <div>
              <h2>App 访问</h2>
              <p>勾选该用户可访问的应用。</p>
            </div>
          </div>

          <div className="admin-apps-table-wrap">
            <table className="admin-apps-table" style={{ minWidth: 460 }}>
              <tbody>
                {matrix.apps.map((app) => (
                  <tr key={app.app_code}>
                    <td>
                      <label className="admin-users-matrix-check">
                        <input
                          checked={Boolean(accessDraft[app.app_code])}
                          disabled={!canManage || selectedUser === null}
                          type="checkbox"
                          onChange={(event) => setAppAccess(app.app_code, event.target.checked)}
                        />
                        <span>{app.app_name}</span>
                      </label>

                      <button
                        className={
                          selectedAppCode === app.app_code
                            ? "admin-apps-button primary"
                            : "admin-apps-button secondary"
                        }
                        type="button"
                        onClick={() => setSelectedAppCode(app.app_code)}
                      >
                        查看页面
                      </button>

                      <div className="admin-apps-muted">
                        {app.app_code} · {app.status} · {app.is_active ? "启用" : "停用"}
                      </div>
                    </td>
                  </tr>
                ))}

                {matrix.apps.length === 0 ? (
                  <tr>
                    <td className="admin-apps-empty-cell">暂无应用</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-apps-card">
          <div className="admin-apps-table-header">
            <div>
              <h2>{selectedApp?.app_name ?? "页面权限"}</h2>
              <p>
                Apply：{statusLabel(selectedStatus?.latest_apply?.status)}；Verify：
                {statusLabel(selectedStatus?.latest_verify?.status)}
              </p>
              {selectedStatus?.latest_verify ? (
                <p className="admin-apps-muted">
                  最近验证：HTTP {emptyText(selectedStatus.latest_verify.http_status)} ·{" "}
                  {formatDateTime(selectedStatus.latest_verify.finished_at)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="admin-apps-table-wrap">
            <table className="admin-apps-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th>页面</th>
                  <th>路由</th>
                  <th>读</th>
                  <th>写</th>
                </tr>
              </thead>
              <tbody>
                {selectedAppPages.map((page) => {
                  const appDraft = permissionDraft[page.app_code] ?? {};
                  const readCode = page.read_permission_code;
                  const writeCode = page.write_permission_code;
                  const appEnabled = Boolean(accessDraft[page.app_code]);

                  return (
                    <tr key={page.page_code}>
                      <td>
                        <div>{page.page_name}</div>
                        <div className="admin-apps-code">{page.page_code}</div>
                        <div className="admin-apps-muted">
                          level {page.level} · parent {emptyText(page.parent_page_code)}
                        </div>
                      </td>
                      <td>{emptyText(page.route_path)}</td>
                      <td>
                        {readCode ? (
                          <label className="admin-users-matrix-check">
                            <input
                              checked={Boolean(appDraft[readCode])}
                              disabled={!canManage || selectedUser === null || !appEnabled}
                              type="checkbox"
                              onChange={(event) =>
                                setPermission(page.app_code, readCode, event.target.checked)
                              }
                            />
                            <span>{readCode}</span>
                          </label>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {writeCode ? (
                          <label className="admin-users-matrix-check">
                            <input
                              checked={Boolean(appDraft[writeCode])}
                              disabled={!canManage || selectedUser === null || !appEnabled}
                              type="checkbox"
                              onChange={(event) =>
                                setWritePermission(
                                  page.app_code,
                                  readCode,
                                  writeCode,
                                  event.target.checked,
                                )
                              }
                            />
                            <span>{writeCode}</span>
                          </label>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}

                {selectedAppPages.length === 0 ? (
                  <tr>
                    <td className="admin-apps-empty-cell" colSpan={4}>
                      暂无页面权限目录
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
