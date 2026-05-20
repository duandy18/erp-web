import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useSessionRuntime } from "../../../iam/runtime/useSessionRuntime";
import type {
  AdminAppDTO,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppStatus,
} from "../contracts/adminApps";
import type { AdminAppsPresenter } from "../hooks/useAdminAppsPresenter";

type AdminAppsPanelProps = {
  presenter: AdminAppsPresenter;
};

type StatusFilter = "all" | AdminAppStatus;
type ActiveFilter = "all" | "active" | "inactive";

type AdminAppDraft = {
  name: string;
  description: string;
  web_path: string;
  api_path: string;
  local_web_url: string;
  local_api_url: string;
  status: AdminAppStatus;
  sort_order: string;
  is_active: boolean;
};

type DraftMap = Record<string, AdminAppDraft>;

const CODE_PATTERN = /^[a-z][a-z0-9-]*$/;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
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

function formatSyncRunMessage(result: AdminAppSelfDescriptionSyncRunDTO): string {
  if (result.status !== "success") {
    return result.error_message ?? result.raw_excerpt ?? "自描述同步未成功";
  }

  return [
    "自描述同步成功",
    `读取 ${result.fetched_count}`,
    `新增 ${result.inserted_count}`,
    `更新 ${result.updated_count}`,
    `删除 ${result.deleted_count}`,
    `完成时间 ${formatDateTime(result.finished_at)}`,
  ].join("，");
}

function getSelfDescriptionSyncDisabledReason(app: AdminAppDTO): string | null {
  if (app.code === "erp") {
    return "ERP 总控平台不参与业务系统自描述同步";
  }

  return null;
}

function toDraft(app: AdminAppDTO): AdminAppDraft {
  return {
    name: app.name,
    description: app.description,
    web_path: app.web_path,
    api_path: app.api_path,
    local_web_url: app.local_web_url,
    local_api_url: app.local_api_url,
    status: app.status,
    sort_order: String(app.sort_order),
    is_active: app.is_active,
  };
}

function isDraftDirty(app: AdminAppDTO, draft: AdminAppDraft): boolean {
  const original = toDraft(app);

  return (
    original.name !== draft.name ||
    original.description !== draft.description ||
    original.web_path !== draft.web_path ||
    original.api_path !== draft.api_path ||
    original.local_web_url !== draft.local_web_url ||
    original.local_api_url !== draft.local_api_url ||
    original.status !== draft.status ||
    original.sort_order !== draft.sort_order ||
    original.is_active !== draft.is_active
  );
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(message);
  }

  return trimmed;
}

function parseSortOrder(value: string): number {
  const trimmed = requireTrimmed(value, "请填写排序值");
  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed)) {
    throw new Error("排序值必须是整数");
  }

  return parsed;
}

function validatePath(value: string, message: string): string {
  const trimmed = requireTrimmed(value, message);

  if (!trimmed.startsWith("/")) {
    throw new Error("入口路径必须以 / 开头");
  }

  return trimmed;
}

function validateLocalUrl(value: string, message: string): string {
  const trimmed = requireTrimmed(value, message);

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error("本地调试 / 运行地址必须以 http:// 或 https:// 开头");
  }

  return trimmed;
}

export function AdminAppsPanel({ presenter }: AdminAppsPanelProps) {
  const { user } = useSessionRuntime();

  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    apps,
    loading,
    creating,
    mutating,
    syncingCode,
    error,
    createApp,
    updateApp,
    syncSelfDescription,
    enableApp,
    disableApp,
    setError,
  } = presenter;

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<DraftMap>({});

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWebPath, setNewWebPath] = useState("");
  const [newApiPath, setNewApiPath] = useState("");
  const [newLocalWebUrl, setNewLocalWebUrl] = useState("");
  const [newLocalApiUrl, setNewLocalApiUrl] = useState("");
  const [newStatus, setNewStatus] = useState<AdminAppStatus>("planned");
  const [newSortOrder, setNewSortOrder] = useState("0");
  const [newIsActive, setNewIsActive] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const next: DraftMap = {};

      for (const app of apps) {
        next[app.code] = toDraft(app);
      }

      setDrafts(next);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [apps]);

  const filteredApps = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return apps.filter((app) => {
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      if (activeFilter === "active" && !app.is_active) return false;
      if (activeFilter === "inactive" && app.is_active) return false;
      if (!normalizedKeyword) return true;

      const haystack = [
        app.code,
        app.name,
        app.description,
        app.web_path,
        app.api_path,
        app.local_web_url,
        app.local_api_url,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [activeFilter, apps, keyword, statusFilter]);

  function patchDraft(code: string, patch: Partial<AdminAppDraft>) {
    if (!canManage) return;

    const app = apps.find((item) => item.code === code);
    if (!app) return;

    setDrafts((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] ?? toDraft(app)),
        ...patch,
      },
    }));
  }

  function resetCreateForm() {
    setNewCode("");
    setNewName("");
    setNewDescription("");
    setNewWebPath("");
    setNewApiPath("");
    setNewLocalWebUrl("");
    setNewLocalApiUrl("");
    setNewStatus("planned");
    setNewSortOrder("0");
    setNewIsActive(true);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    try {
      const code = requireTrimmed(newCode, "请填写系统编码");
      if (!CODE_PATTERN.test(code)) {
        throw new Error("系统编码只能使用小写字母、数字和中划线，并且必须以小写字母开头");
      }

      await createApp({
        code,
        name: requireTrimmed(newName, "请填写系统名称"),
        description: requireTrimmed(newDescription, "请填写系统说明"),
        web_path: validatePath(newWebPath, "请填写 Web 入口路径"),
        api_path: validatePath(newApiPath, "请填写 API 入口路径"),
        local_web_url: validateLocalUrl(newLocalWebUrl, "请填写本地 Web 调试地址"),
        local_api_url: validateLocalUrl(newLocalApiUrl, "请填写本地 API 运行地址"),
        status: newStatus,
        sort_order: parseSortOrder(newSortOrder),
        is_active: newIsActive,
      });

      resetCreateForm();
    } catch (currentError) {
      setError(errorMessage(currentError, "创建独立系统失败"));
    }
  }

  async function handleSave(app: AdminAppDTO) {
    if (!canManage) return;

    const draft = drafts[app.code] ?? toDraft(app);

    try {
      await updateApp(app.code, {
        name: requireTrimmed(draft.name, "请填写系统名称"),
        description: requireTrimmed(draft.description, "请填写系统说明"),
        web_path: validatePath(draft.web_path, "请填写 Web 入口路径"),
        api_path: validatePath(draft.api_path, "请填写 API 入口路径"),
        local_web_url: validateLocalUrl(draft.local_web_url, "请填写本地 Web 调试地址"),
        local_api_url: validateLocalUrl(draft.local_api_url, "请填写本地 API 运行地址"),
        status: draft.status,
        sort_order: parseSortOrder(draft.sort_order),
        is_active: draft.is_active,
      });

      setRowMessage((prev) => ({ ...prev, [app.code]: "独立系统信息已保存" }));
    } catch (currentError) {
      setRowMessage((prev) => ({
        ...prev,
        [app.code]: errorMessage(currentError, "保存失败"),
      }));
    }
  }

  async function handleSyncSelfDescription(app: AdminAppDTO) {
    if (!canManage) return;

    const disabledReason = getSelfDescriptionSyncDisabledReason(app);
    if (disabledReason) {
      setRowMessage((prev) => ({
        ...prev,
        [app.code]: disabledReason,
      }));
      return;
    }

    setRowMessage((prev) => ({
      ...prev,
      [app.code]: "正在同步自描述…",
    }));

    try {
      const result = await syncSelfDescription(app.code);
      setRowMessage((prev) => ({
        ...prev,
        [app.code]: formatSyncRunMessage(result),
      }));
    } catch (currentError) {
      setRowMessage((prev) => ({
        ...prev,
        [app.code]: errorMessage(currentError, "同步自描述失败"),
      }));
    }
  }

  async function handleToggleActive(app: AdminAppDTO) {
    if (!canManage) return;

    const nextAction = app.is_active ? "停用" : "启用";
    if (!window.confirm(`确认${nextAction}独立系统「${app.name}」？`)) return;

    try {
      if (app.is_active) {
        await disableApp(app.code);
      } else {
        await enableApp(app.code);
      }

      setRowMessage((prev) => ({ ...prev, [app.code]: `独立系统已${nextAction}` }));
    } catch (currentError) {
      setRowMessage((prev) => ({
        ...prev,
        [app.code]: errorMessage(currentError, `${nextAction}失败`),
      }));
    }
  }

  if (!canRead) {
    return (
      <div className="admin-apps-card">
        <p>当前账号无系统管理页面访问权限。</p>
      </div>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}

      {!canManage ? (
        <div className="admin-apps-alert">当前为只读模式，不能创建、编辑、启用、停用或同步自描述。</div>
      ) : null}

      {canManage ? (
        <form className="admin-apps-card admin-apps-create-grid" onSubmit={handleCreate}>
          <div className="admin-apps-form-intro">
            <h2>创建独立系统</h2>
            <p>
              登记 ERP 控制面入口和本地调试 / 运行配置。Manifest V2 自描述内容以同步结果为准。
            </p>
          </div>

          <label>
            <span>系统编码</span>
            <input
              placeholder="billing"
              value={newCode}
              onChange={(event) => setNewCode(event.target.value)}
            />
          </label>

          <label>
            <span>系统名称</span>
            <input
              placeholder="Billing 财务系统"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>

          <label>
            <span>状态</span>
            <select
              value={newStatus}
              onChange={(event) => setNewStatus(event.target.value as AdminAppStatus)}
            >
              <option value="planned">规划中</option>
              <option value="ready">已就绪</option>
            </select>
          </label>

          <label>
            <span>排序</span>
            <input value={newSortOrder} onChange={(event) => setNewSortOrder(event.target.value)} />
          </label>

          <label className="admin-apps-check">
            <input
              type="checkbox"
              checked={newIsActive}
              onChange={(event) => setNewIsActive(event.target.checked)}
            />
            <span>启用</span>
          </label>

          <label className="admin-apps-wide">
            <span>系统说明</span>
            <input
              placeholder="说明该系统的边界和入口用途"
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
            />
          </label>

          <label>
            <span>Web 入口路径</span>
            <input
              placeholder="/billing"
              value={newWebPath}
              onChange={(event) => setNewWebPath(event.target.value)}
            />
          </label>

          <label>
            <span>API 入口路径</span>
            <input
              placeholder="/api/billing"
              value={newApiPath}
              onChange={(event) => setNewApiPath(event.target.value)}
            />
          </label>

          <label>
            <span>本地 Web 调试地址</span>
            <input
              placeholder="http://127.0.0.1:5178"
              value={newLocalWebUrl}
              onChange={(event) => setNewLocalWebUrl(event.target.value)}
            />
          </label>

          <label>
            <span>本地 API 运行地址</span>
            <input
              placeholder="http://127.0.0.1:8025"
              value={newLocalApiUrl}
              onChange={(event) => setNewLocalApiUrl(event.target.value)}
            />
          </label>

          <button type="submit" className="admin-apps-button primary" disabled={creating}>
            {creating ? "创建中…" : "创建系统"}
          </button>
        </form>
      ) : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>独立系统列表</h2>
            <p>
              管理系统入口路径、本地调试 / 运行配置、启停状态和自描述同步。应用自描述内容以
              Manifest V2 同步页为准。
            </p>
          </div>

          <div className="admin-apps-toolbar">
            <input
              placeholder="搜索编码 / 名称 / 入口路径 / 本地运行地址"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">全部状态</option>
              <option value="ready">已就绪</option>
              <option value="planned">规划中</option>
            </select>
            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
            >
              <option value="all">全部启停</option>
              <option value="active">仅启用</option>
              <option value="inactive">仅停用</option>
            </select>
          </div>
        </div>

        {loading ? <div className="admin-apps-alert">加载中…</div> : null}

        <div className="admin-apps-table-wrap">
          <table className="admin-apps-table">
            <thead>
              <tr>
                <th>系统</th>
                <th>说明</th>
                <th>统一入口</th>
                <th>本地运行配置</th>
                <th>状态</th>
                <th>排序</th>
                <th>启停</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-apps-empty-cell">
                    暂无符合条件的独立系统
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const draft = drafts[app.code] ?? toDraft(app);
                  const dirty = isDraftDirty(app, draft);
                  const isSyncing = syncingCode === app.code;
                  const syncDisabledReason = getSelfDescriptionSyncDisabledReason(app);
                  const syncDisabled =
                    !canManage || mutating || isSyncing || syncDisabledReason !== null;

                  return (
                    <tr key={app.code}>
                      <td>
                        <div className="admin-apps-code">{app.code}</div>
                        <input
                          value={draft.name}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) => patchDraft(app.code, { name: event.target.value })}
                        />
                      </td>
                      <td>
                        <textarea
                          value={draft.description}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { description: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <div className="admin-apps-muted">Web 入口路径</div>
                        <input
                          value={draft.web_path}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { web_path: event.target.value })
                          }
                        />
                        <div className="admin-apps-muted">API 入口路径</div>
                        <input
                          value={draft.api_path}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { api_path: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <div className="admin-apps-muted">本地 Web 调试地址</div>
                        <input
                          value={draft.local_web_url}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { local_web_url: event.target.value })
                          }
                        />
                        <div className="admin-apps-muted">本地 API 运行地址</div>
                        <input
                          value={draft.local_api_url}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { local_api_url: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={draft.status}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { status: event.target.value as AdminAppStatus })
                          }
                        >
                          <option value="ready">已就绪</option>
                          <option value="planned">规划中</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={draft.sort_order}
                          disabled={!canManage || mutating || isSyncing}
                          onChange={(event) =>
                            patchDraft(app.code, { sort_order: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <label className="admin-apps-check">
                          <input
                            type="checkbox"
                            checked={draft.is_active}
                            disabled={!canManage || mutating || isSyncing}
                            onChange={(event) =>
                              patchDraft(app.code, { is_active: event.target.checked })
                            }
                          />
                          <span>{draft.is_active ? "启用" : "停用"}</span>
                        </label>
                        <span
                          className={
                            app.is_active
                              ? "admin-apps-status success"
                              : "admin-apps-status muted"
                          }
                        >
                          当前：{app.is_active ? "启用" : "停用"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-apps-row-actions">
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={!canManage || mutating || isSyncing || !dirty}
                            onClick={() => {
                              void handleSave(app);
                            }}
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={syncDisabled}
                            title={syncDisabledReason ?? undefined}
                            onClick={() => {
                              void handleSyncSelfDescription(app);
                            }}
                          >
                            {syncDisabledReason
                              ? "不参与同步"
                              : isSyncing
                                ? "同步中…"
                                : "同步自描述"}
                          </button>
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={!canManage || mutating || isSyncing}
                            onClick={() => {
                              void handleToggleActive(app);
                            }}
                          >
                            {app.is_active ? "停用" : "启用"}
                          </button>
                        </div>

                        {syncDisabledReason ? (
                          <div className="admin-apps-muted">{syncDisabledReason}</div>
                        ) : null}
                        {dirty ? <div className="admin-apps-muted">本行有未保存修改</div> : null}
                        {rowMessage[app.code] ? (
                          <div className="admin-apps-muted">{rowMessage[app.code]}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
