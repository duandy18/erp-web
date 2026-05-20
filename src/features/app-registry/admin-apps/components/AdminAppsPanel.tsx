import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useSessionRuntime } from "../../../iam/runtime/useSessionRuntime";
import type { AppRegistrationStatus } from "../../contracts/appRegistry";
import type {
  AdminAppDTO,
  AdminAppRegistrationRequestDTO,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppStatus,
} from "../contracts/adminApps";
import type { AdminAppsPresenter } from "../hooks/useAdminAppsPresenter";

type AdminAppsPanelProps = {
  presenter: AdminAppsPresenter;
};

type StatusFilter = "all" | AdminAppStatus;
type ActiveFilter = "all" | "active" | "inactive";
type RegistrationSourceType = "control_base_url" | "manifest_url";

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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
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

function statusText(status: AdminAppStatus): string {
  return status === "ready" ? "已就绪" : "规划中";
}

function registrationStatusText(status: AppRegistrationStatus | string | undefined): string {
  switch (status ?? "approved") {
    case "draft":
      return "草稿";
    case "pending_review":
      return "待审核";
    case "approved":
      return "已批准接入";
    case "rejected":
      return "已拒绝";
    case "suspended":
      return "已暂停";
    default:
      return String(status);
  }
}

function requestStatusText(status: string): string {
  switch (status) {
    case "pending_review":
      return "待审核";
    case "approved":
      return "已批准";
    case "rejected":
      return "已拒绝";
    case "superseded":
      return "已被替代";
    default:
      return status;
  }
}

function validationStatusText(status: string): string {
  switch (status) {
    case "passed":
      return "校验通过";
    case "failed":
      return "校验失败";
    default:
      return status;
  }
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

  if ((app.registration_status ?? "approved") !== "approved") {
    return "只有已批准接入的系统可以同步自描述";
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function AdminAppsPanel({ presenter }: AdminAppsPanelProps) {
  const { user } = useSessionRuntime();

  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    apps,
    registrationRequests,
    loading,
    loadingRegistrationRequests,
    submittingRegistrationRequest,
    mutating,
    syncingCode,
    reviewingRequestId,
    error,
    createRegistrationRequestFromManifest,
    approveRegistrationRequest,
    rejectRegistrationRequest,
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
  const [requestMessage, setRequestMessage] = useState<Record<number, string>>({});
  const [drafts, setDrafts] = useState<DraftMap>({});

  const [registrationSourceType, setRegistrationSourceType] =
    useState<RegistrationSourceType>("control_base_url");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [registrationReason, setRegistrationReason] = useState("");

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

  const summary = useMemo(
    () => ({
      appCount: apps.length,
      activeCount: apps.filter((app) => app.is_active).length,
      approvedCount: apps.filter((app) => (app.registration_status ?? "approved") === "approved")
        .length,
      suspendedCount: apps.filter((app) => app.registration_status === "suspended").length,
      pendingRequestCount: registrationRequests.filter(
        (request) => request.status === "pending_review",
      ).length,
      rejectedRequestCount: registrationRequests.filter((request) => request.status === "rejected")
        .length,
    }),
    [apps, registrationRequests],
  );

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
        app.registration_status ?? "",
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

  async function handleCreateRegistrationRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    try {
      const url = requireTrimmed(
        registrationUrl,
        registrationSourceType === "control_base_url" ? "请填写控制面地址" : "请填写 Manifest URL",
      );

      const result = await createRegistrationRequestFromManifest(
        registrationSourceType === "control_base_url"
          ? {
              control_base_url: url,
              reason: registrationReason.trim() || undefined,
            }
          : {
              manifest_url: url,
              reason: registrationReason.trim() || undefined,
            },
      );

      setRegistrationUrl("");
      setRegistrationReason("");
      setRequestMessage((prev) => ({
        ...prev,
        [result.request_id]: `已生成接入申请：${result.requested_app_name}`,
      }));
    } catch (currentError) {
      setError(errorMessage(currentError, "生成接入申请失败"));
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

  async function handleApproveRegistrationRequest(request: AdminAppRegistrationRequestDTO) {
    if (!canManage || request.status !== "pending_review") return;

    const reason = window.prompt(`确认批准接入「${request.requested_app_name}」？可填写批准说明。`);
    if (reason === null) return;

    try {
      const result = await approveRegistrationRequest(request.request_id, {
        reason: reason.trim() || undefined,
      });
      setRequestMessage((prev) => ({
        ...prev,
        [request.request_id]: `已批准接入：${result.requested_app_name}`,
      }));
    } catch (currentError) {
      setRequestMessage((prev) => ({
        ...prev,
        [request.request_id]: errorMessage(currentError, "批准接入失败"),
      }));
    }
  }

  async function handleRejectRegistrationRequest(request: AdminAppRegistrationRequestDTO) {
    if (!canManage || request.status !== "pending_review") return;

    const reason = window.prompt(`确认拒绝接入「${request.requested_app_name}」？可填写拒绝原因。`);
    if (reason === null) return;

    try {
      const result = await rejectRegistrationRequest(request.request_id, {
        reason: reason.trim() || undefined,
      });
      setRequestMessage((prev) => ({
        ...prev,
        [request.request_id]: `已拒绝接入：${result.requested_app_name}`,
      }));
    } catch (currentError) {
      setRequestMessage((prev) => ({
        ...prev,
        [request.request_id]: errorMessage(currentError, "拒绝接入失败"),
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
        <div className="admin-apps-alert">
          当前为只读模式，不能生成接入申请、批准、拒绝、编辑、启用、停用或同步自描述。
        </div>
      ) : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>应用接入汇总</h2>
            <p>应用注册页负责 Manifest-first 接入流程；系统协作合同结果请到“合同目录”查看。</p>
          </div>
        </div>
        <div className="admin-apps-profile-grid">
          <SummaryCard label="已登记系统" value={summary.appCount} />
          <SummaryCard label="启用系统" value={summary.activeCount} />
          <SummaryCard label="已批准接入" value={summary.approvedCount} />
          <SummaryCard label="已暂停接入" value={summary.suspendedCount} />
          <SummaryCard label="待审核申请" value={summary.pendingRequestCount} />
          <SummaryCard label="已拒绝申请" value={summary.rejectedRequestCount} />
        </div>
      </section>

      {canManage ? (
        <form className="admin-apps-card admin-apps-create-grid" onSubmit={handleCreateRegistrationRequest}>
          <div className="admin-apps-form-intro">
            <h2>Manifest 导入接入</h2>
            <p>
              输入控制面地址或 Manifest URL。ERP 会拉取 Manifest V2，校验通过后生成待审核接入申请。
            </p>
          </div>

          <label>
            <span>导入方式</span>
            <select
              value={registrationSourceType}
              onChange={(event) => setRegistrationSourceType(event.target.value as RegistrationSourceType)}
            >
              <option value="control_base_url">控制面地址</option>
              <option value="manifest_url">Manifest URL</option>
            </select>
          </label>

          <label className="admin-apps-wide">
            <span>{registrationSourceType === "control_base_url" ? "控制面地址" : "Manifest URL"}</span>
            <input
              placeholder={
                registrationSourceType === "control_base_url"
                  ? "http://127.0.0.1:8025"
                  : "http://127.0.0.1:8025/system/read/v1/app-manifest"
              }
              value={registrationUrl}
              onChange={(event) => setRegistrationUrl(event.target.value)}
            />
          </label>

          <label className="admin-apps-wide">
            <span>申请说明</span>
            <input
              placeholder="说明为什么要接入该系统，可选"
              value={registrationReason}
              onChange={(event) => setRegistrationReason(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="admin-apps-button primary"
            disabled={submittingRegistrationRequest}
          >
            {submittingRegistrationRequest ? "生成中…" : "生成接入申请"}
          </button>
        </form>
      ) : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>接入申请</h2>
            <p>只通过 Manifest V2 生成申请。批准后才会写入正式应用列表。</p>
          </div>
        </div>

        {loadingRegistrationRequests ? <div className="admin-apps-alert">正在加载接入申请…</div> : null}

        <div className="admin-apps-table-wrap">
          <table className="admin-apps-table">
            <thead>
              <tr>
                <th>申请系统</th>
                <th>Manifest 来源</th>
                <th>校验</th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {registrationRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-apps-empty-cell">
                    暂无接入申请
                  </td>
                </tr>
              ) : (
                registrationRequests.map((request) => {
                  const isReviewing = reviewingRequestId === request.request_id;
                  const canReview = canManage && request.status === "pending_review" && reviewingRequestId === null;

                  return (
                    <tr key={request.request_id}>
                      <td>
                        <div>{request.requested_app_name}</div>
                        <div className="admin-apps-code">{request.requested_app_code}</div>
                        <div className="admin-apps-muted">{request.requested_app_description}</div>
                      </td>
                      <td>
                        <div className="admin-apps-muted">控制面</div>
                        <div>{request.control_base_url}</div>
                        <div className="admin-apps-muted">Manifest</div>
                        <div>{request.manifest_url}</div>
                      </td>
                      <td>
                        <span
                          className={
                            request.validation_status === "passed"
                              ? "admin-apps-status success"
                              : "admin-apps-status muted"
                          }
                        >
                          {validationStatusText(request.validation_status)}
                        </span>
                        {request.validation_errors.length > 0 ? (
                          <div className="admin-apps-muted">{request.validation_errors.join("；")}</div>
                        ) : null}
                      </td>
                      <td>{requestStatusText(request.status)}</td>
                      <td>
                        <div>提交：{formatDateTime(request.created_at)}</div>
                        <div>审核：{formatDateTime(request.reviewed_at)}</div>
                      </td>
                      <td>
                        <div className="admin-apps-row-actions">
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={!canReview}
                            onClick={() => {
                              void handleApproveRegistrationRequest(request);
                            }}
                          >
                            {isReviewing ? "处理中…" : "批准接入"}
                          </button>
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={!canReview}
                            onClick={() => {
                              void handleRejectRegistrationRequest(request);
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                        {request.request_reason ? (
                          <div className="admin-apps-muted">申请说明：{request.request_reason}</div>
                        ) : null}
                        {request.review_reason ? (
                          <div className="admin-apps-muted">审核说明：{request.review_reason}</div>
                        ) : null}
                        {requestMessage[request.request_id] ? (
                          <div className="admin-apps-muted">{requestMessage[request.request_id]}</div>
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

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>已接入系统</h2>
            <p>
              这里维护已接入系统的入口路径、本地运行配置、启停状态和自描述同步。新增系统必须先走
              Manifest 接入申请。
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
                <th>接入状态</th>
                <th>系统状态</th>
                <th>排序</th>
                <th>启停</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-apps-empty-cell">
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
                        <span className="admin-apps-status success">
                          {registrationStatusText(app.registration_status)}
                        </span>
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
                        <div className="admin-apps-muted">当前：{statusText(app.status)}</div>
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
                              ? "不可同步"
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
