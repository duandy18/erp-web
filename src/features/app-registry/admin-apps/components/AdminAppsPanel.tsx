import { useMemo, useState, type FormEvent } from "react";

import { useSessionRuntime } from "../../../iam/runtime/useSessionRuntime";
import type { AppRegistrationStatus } from "../../contracts/appRegistry";
import type {
  AdminAppDTO,
  AdminAppRegistrationRequestDTO,
  AdminAppSelfDescriptionSyncRunDTO,
} from "../contracts/adminApps";
import type { AdminAppsPresenter } from "../hooks/useAdminAppsPresenter";

type AdminAppsPanelProps = {
  presenter: AdminAppsPresenter;
};

type RegistrationSourceType = "control_base_url" | "manifest_url";

type OperationStatus = {
  level: "info" | "success" | "error";
  action: string;
  target: string;
  message: string;
  finishedAt: string;
};

type RowSyncStatus = {
  level: "info" | "success" | "error";
  message: string;
  finishedAt: string;
};

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

function operationTimeNow(): string {
  return new Date().toLocaleString("zh-CN", {
    hour12: false,
  });
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
    return result.error_message ?? result.raw_excerpt ?? "同步未成功";
  }

  return [
    "同步完成",
    `读取 ${result.fetched_count}`,
    `新增 ${result.inserted_count}`,
    `更新 ${result.updated_count}`,
    `删除 ${result.deleted_count}`,
    `完成时间 ${formatDateTime(result.finished_at)}`,
  ].join("，");
}

function getSyncDisabledReason(app: AdminAppDTO): string | null {
  if (app.code === "erp") {
    return "ERP 总控平台不参与业务系统同步";
  }

  if ((app.registration_status ?? "approved") !== "approved") {
    return "只有已批准接入的系统可以同步";
  }

  return null;
}

function getMyAppsVisibilityDisabledReason(app: AdminAppDTO): string | null {
  if (app.code === "erp") {
    return "ERP 总控平台不作为我的应用卡片展示";
  }

  if (app.show_in_my_apps) {
    return null;
  }

  if ((app.registration_status ?? "approved") !== "approved") {
    return "只有已批准接入的系统可以显示到我的应用";
  }

  if (!app.is_active) {
    return "未启用的系统不能显示到我的应用";
  }

  return null;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(message);
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

function OperationStatusBar({ status }: { status: OperationStatus | null }) {
  if (!status) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>操作状态</h2>
            <p>暂无操作结果。生成接入申请、批准、拒绝或同步后会在这里显示结果。</p>
          </div>
        </div>
      </section>
    );
  }

  const className =
    status.level === "error"
      ? "admin-apps-alert danger"
      : status.level === "success"
        ? "admin-apps-alert success"
        : "admin-apps-alert";

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>操作状态</h2>
          <p>
            {status.action}｜{status.target}｜{status.finishedAt}
          </p>
        </div>
      </div>
      <div className={className}>{status.message}</div>
    </section>
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
    syncingCode,
    visibilityChangingCode,
    reviewingRequestId,
    error,
    createRegistrationRequestFromManifest,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    syncSelfDescription,
    showAppInMyApps,
    hideAppFromMyApps,
    setError,
  } = presenter;

  const [keyword, setKeyword] = useState("");
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const [syncResultByCode, setSyncResultByCode] = useState<Record<string, RowSyncStatus>>({});
  const [registrationSourceType, setRegistrationSourceType] =
    useState<RegistrationSourceType>("control_base_url");
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [registrationReason, setRegistrationReason] = useState("");

  const summary = useMemo(
    () => ({
      appCount: apps.length,
      myAppsVisibleCount: apps.filter((app) => app.show_in_my_apps).length,
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

    if (!normalizedKeyword) {
      return apps;
    }

    return apps.filter((app) =>
      [
        app.code,
        app.name,
        app.description,
        app.web_path,
        app.api_path,
        app.registration_status ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [apps, keyword]);

  function setOperationResult(status: Omit<OperationStatus, "finishedAt">) {
    setOperationStatus({
      ...status,
      finishedAt: operationTimeNow(),
    });
  }

  function setRowSyncResult(code: string, status: Omit<RowSyncStatus, "finishedAt">) {
    setSyncResultByCode((prev) => ({
      ...prev,
      [code]: {
        ...status,
        finishedAt: operationTimeNow(),
      },
    }));
  }

  async function handleCreateRegistrationRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    try {
      const url = requireTrimmed(
        registrationUrl,
        registrationSourceType === "control_base_url"
          ? "请填写接入管理地址"
          : "请填写 Manifest URL",
      );

      setOperationResult({
        level: "info",
        action: "生成接入申请",
        target: url,
        message: "正在拉取 Manifest V2 并生成接入申请…",
      });

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
      setOperationResult({
        level: "success",
        action: "生成接入申请",
        target: result.requested_app_name,
        message: `已生成接入申请：${result.requested_app_name}`,
      });
    } catch (currentError) {
      const message = errorMessage(currentError, "生成接入申请失败");
      setOperationResult({
        level: "error",
        action: "生成接入申请",
        target: registrationUrl || "-",
        message,
      });
      setError(message);
    }
  }

  async function handleSync(app: AdminAppDTO) {
    if (!canManage) return;

    const disabledReason = getSyncDisabledReason(app);
    if (disabledReason) {
      setOperationResult({
        level: "info",
        action: "同步",
        target: app.name,
        message: disabledReason,
      });
      setRowSyncResult(app.code, {
        level: "info",
        message: disabledReason,
      });
      return;
    }

    setOperationResult({
      level: "info",
      action: "同步",
      target: app.name,
      message: `正在同步 ${app.name} 的 Manifest、页面目录、能力目录和依赖目录…`,
    });
    setRowSyncResult(app.code, {
      level: "info",
      message: "同步中…",
    });

    try {
      const result = await syncSelfDescription(app.code);
      const level = result.status === "success" ? "success" : "error";
      const message = formatSyncRunMessage(result);
      setOperationResult({
        level,
        action: "同步",
        target: app.name,
        message,
      });
      setRowSyncResult(app.code, {
        level,
        message,
      });
    } catch (currentError) {
      const message = errorMessage(currentError, "同步失败");
      setOperationResult({
        level: "error",
        action: "同步",
        target: app.name,
        message,
      });
      setRowSyncResult(app.code, {
        level: "error",
        message,
      });
    }
  }

  async function handleToggleMyAppsVisibility(app: AdminAppDTO) {
    if (!canManage) return;

    const disabledReason = getMyAppsVisibilityDisabledReason(app);
    if (disabledReason) {
      setOperationResult({
        level: "info",
        action: "我的应用显示",
        target: app.name,
        message: disabledReason,
      });
      return;
    }

    const nextVisible = !app.show_in_my_apps;
    setOperationResult({
      level: "info",
      action: "我的应用显示",
      target: app.name,
      message: nextVisible
        ? `正在将 ${app.name} 显示到我的应用…`
        : `正在设置 ${app.name} 不在我的应用中显示…`,
    });

    try {
      if (nextVisible) {
        await showAppInMyApps(app.code);
      } else {
        await hideAppFromMyApps(app.code);
      }

      setOperationResult({
        level: "success",
        action: "我的应用显示",
        target: app.name,
        message: nextVisible
          ? `已显示到我的应用：${app.name}`
          : `已设置为不在我的应用中显示：${app.name}`,
      });
    } catch (currentError) {
      setOperationResult({
        level: "error",
        action: "我的应用显示",
        target: app.name,
        message: errorMessage(currentError, "我的应用显示设置失败"),
      });
    }
  }

  async function handleApproveRegistrationRequest(request: AdminAppRegistrationRequestDTO) {
    if (!canManage || request.status !== "pending_review") return;

    const reason = window.prompt(`确认批准接入「${request.requested_app_name}」？可填写批准说明。`);
    if (reason === null) return;

    setOperationResult({
      level: "info",
      action: "批准接入",
      target: request.requested_app_name,
      message: "正在批准接入申请…",
    });

    try {
      const result = await approveRegistrationRequest(request.request_id, {
        reason: reason.trim() || undefined,
      });
      setOperationResult({
        level: "success",
        action: "批准接入",
        target: result.requested_app_name,
        message: `已批准接入：${result.requested_app_name}`,
      });
    } catch (currentError) {
      setOperationResult({
        level: "error",
        action: "批准接入",
        target: request.requested_app_name,
        message: errorMessage(currentError, "批准接入失败"),
      });
    }
  }

  async function handleRejectRegistrationRequest(request: AdminAppRegistrationRequestDTO) {
    if (!canManage || request.status !== "pending_review") return;

    const reason = window.prompt(`确认拒绝接入「${request.requested_app_name}」？可填写拒绝原因。`);
    if (reason === null) return;

    setOperationResult({
      level: "info",
      action: "拒绝接入",
      target: request.requested_app_name,
      message: "正在拒绝接入申请…",
    });

    try {
      const result = await rejectRegistrationRequest(request.request_id, {
        reason: reason.trim() || undefined,
      });
      setOperationResult({
        level: "success",
        action: "拒绝接入",
        target: result.requested_app_name,
        message: `已拒绝接入：${result.requested_app_name}`,
      });
    } catch (currentError) {
      setOperationResult({
        level: "error",
        action: "拒绝接入",
        target: request.requested_app_name,
        message: errorMessage(currentError, "拒绝接入失败"),
      });
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
          当前为只读模式，不能生成接入申请、批准、拒绝或同步。
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
          <SummaryCard label="显示在我的应用" value={summary.myAppsVisibleCount} />
          <SummaryCard label="已批准接入" value={summary.approvedCount} />
          <SummaryCard label="已暂停接入" value={summary.suspendedCount} />
          <SummaryCard label="待审核申请" value={summary.pendingRequestCount} />
          <SummaryCard label="已拒绝申请" value={summary.rejectedRequestCount} />
        </div>
      </section>

      <OperationStatusBar status={operationStatus} />

      {canManage ? (
        <form
          className="admin-apps-card admin-apps-create-grid"
          onSubmit={handleCreateRegistrationRequest}
        >
          <div className="admin-apps-form-intro">
            <h2>Manifest 导入接入</h2>
            <p>
              输入接入管理地址或 Manifest URL。ERP 会拉取 Manifest V2，校验通过后生成待审核接入申请。
            </p>
          </div>

          <label>
            <span>导入方式</span>
            <select
              value={registrationSourceType}
              onChange={(event) =>
                setRegistrationSourceType(event.target.value as RegistrationSourceType)
              }
            >
              <option value="control_base_url">接入管理地址</option>
              <option value="manifest_url">Manifest URL</option>
            </select>
          </label>

          <label className="admin-apps-wide">
            <span>
              {registrationSourceType === "control_base_url" ? "接入管理地址" : "Manifest URL"}
            </span>
            <input
              placeholder={
                registrationSourceType === "control_base_url"
                  ? "http://127.0.0.1:8025"
                  : "http://127.0.0.1:8025/system/read/v1/app-manifest"
              }
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={registrationUrl}
              onKeyDownCapture={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onInput={(event) => setRegistrationUrl(event.currentTarget.value)}
              onChange={(event) => setRegistrationUrl(event.currentTarget.value)}
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
                  <td colSpan={7} className="admin-apps-empty-cell">
                    暂无接入申请
                  </td>
                </tr>
              ) : (
                registrationRequests.map((request) => {
                  const isReviewing = reviewingRequestId === request.request_id;
                  const canReview =
                    canManage && request.status === "pending_review" && reviewingRequestId === null;

                  return (
                    <tr key={request.request_id}>
                      <td>
                        <div>{request.requested_app_name}</div>
                        <div className="admin-apps-code">{request.requested_app_code}</div>
                        <div className="admin-apps-muted">{request.requested_app_description}</div>
                      </td>
                      <td>
                        <div className="admin-apps-muted">接入管理地址</div>
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
                          <div className="admin-apps-muted">
                            {request.validation_errors.join("；")}
                          </div>
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
            <p>已接入系统只展示 ERP 注册信息。运行地址、管理接口和构建信息以 Manifest V2 为准。</p>
          </div>

          <div className="admin-apps-toolbar">
            <input
              placeholder="搜索编码 / 名称 / 入口路径"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>

        {loading ? <div className="admin-apps-alert">加载中…</div> : null}

        <div className="admin-apps-table-wrap">
          <table className="admin-apps-table">
            <thead>
              <tr>
                <th>系统</th>
                <th>说明</th>
                <th>网关入口</th>
                <th>接入状态</th>
                <th>是否显示在我的应用</th>
                <th>排序</th>
                <th>同步结果</th>
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
                  const isSyncing = syncingCode === app.code;
                  const syncDisabledReason = getSyncDisabledReason(app);
                  const syncDisabled = !canManage || isSyncing || syncDisabledReason !== null;
                  const syncResult = syncResultByCode[app.code];
                  const visibilityDisabledReason = getMyAppsVisibilityDisabledReason(app);
                  const visibilityDisabled =
                    !canManage ||
                    visibilityChangingCode === app.code ||
                    visibilityDisabledReason !== null;

                  return (
                    <tr key={app.code}>
                      <td>
                        <div>{app.name}</div>
                        <div className="admin-apps-code">{app.code}</div>
                      </td>
                      <td>{app.description}</td>
                      <td>
                        <div className="admin-apps-muted">Web</div>
                        <div>{app.web_path}</div>
                        <div className="admin-apps-muted">API</div>
                        <div>{app.api_path}</div>
                      </td>
                      <td>
                        <span className="admin-apps-status success">
                          {registrationStatusText(app.registration_status)}
                        </span>
                      </td>
                      <td>{app.show_in_my_apps ? "是" : "否"}</td>
                      <td>{app.sort_order}</td>
                      <td>
                        {syncResult ? (
                          <>
                            <span
                              className={
                                syncResult.level === "success"
                                  ? "admin-apps-status success"
                                  : "admin-apps-status muted"
                              }
                            >
                              {syncResult.level === "success"
                                ? "成功"
                                : syncResult.level === "error"
                                  ? "失败"
                                  : "处理中"}
                            </span>
                            <div className="admin-apps-muted">{syncResult.message}</div>
                            <div className="admin-apps-muted">{syncResult.finishedAt}</div>
                          </>
                        ) : (
                          <span className="admin-apps-muted">暂无本次操作</span>
                        )}
                      </td>
                      <td>
                        <div className="admin-apps-row-actions">
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={syncDisabled}
                            title={syncDisabledReason ?? undefined}
                            onClick={() => {
                              void handleSync(app);
                            }}
                          >
                            {syncDisabledReason ? "不适用" : isSyncing ? "同步中…" : "同步"}
                          </button>
                          <button
                            type="button"
                            className="admin-apps-button secondary"
                            disabled={visibilityDisabled}
                            title={visibilityDisabledReason ?? undefined}
                            onClick={() => {
                              void handleToggleMyAppsVisibility(app);
                            }}
                          >
                            {visibilityDisabledReason
                              ? "不适用"
                              : visibilityChangingCode === app.code
                                ? "处理中…"
                                : app.show_in_my_apps
                                  ? "不在我的应用中显示"
                                  : "显示到我的应用"}
                          </button>
                        </div>
                        {syncDisabledReason ? (
                          <div className="admin-apps-muted">{syncDisabledReason}</div>
                        ) : null}
                        {visibilityDisabledReason ? (
                          <div className="admin-apps-muted">{visibilityDisabledReason}</div>
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
