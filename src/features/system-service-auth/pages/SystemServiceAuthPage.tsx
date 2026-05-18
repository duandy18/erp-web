import { useEffect, useMemo, useState, type FormEvent } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  SystemServiceAuthCapabilityDTO,
  SystemServiceAuthCapabilityOptionDTO,
  SystemServiceAuthCapabilityRouteDTO,
  SystemServiceAuthClientDTO,
  SystemServiceAuthPermissionDTO,
  SystemServiceAuthWriteRunDTO,
  SystemServiceAuthWriteStatusItemDTO,
} from "../contracts/systemServiceAuth";
import { useSystemServiceAuthCapabilities } from "../hooks/useSystemServiceAuthCapabilities";
import { useSystemServiceAuthPermissions } from "../hooks/useSystemServiceAuthPermissions";
import { useSystemServiceAuthWriteStatus } from "../hooks/useSystemServiceAuthWriteStatus";

type ActiveFilter = "all" | "active" | "inactive";
type WriteStatusFilter = "all" | "success" | "failure" | "pending" | "skipped" | "no-run";

type PermissionDraft = {
  description: string;
  is_active: boolean;
};

type PermissionDraftMap = Record<number, PermissionDraft>;

type TargetAppOption = {
  code: string;
  name: string;
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

function WarningPill({ text }: { text: string }) {
  return <span className="admin-apps-status muted">{text}</span>;
}

function WriteStatusPill({ run }: { run: SystemServiceAuthWriteRunDTO | null }) {
  if (!run) {
    return <WarningPill text="未写入" />;
  }

  return (
    <span className={run.status === "success" ? "admin-apps-status success" : "admin-apps-status muted"}>
      {writeStatusText(run.status)}
    </span>
  );
}

function writeStatusText(status: string): string {
  const map: Record<string, string> = {
    failure: "失败",
    pending: "待执行",
    running: "执行中",
    skipped: "跳过",
    success: "成功",
  };

  return map[status] ?? status;
}

function operationText(operation: string): string {
  const map: Record<string, string> = {
    disable: "停用",
    upsert: "写入/更新",
    verify: "读回验证",
  };

  return map[operation] ?? operation;
}

function routeText(route: SystemServiceAuthCapabilityRouteDTO): string {
  return `${route.http_method} ${route.path} ${route.route_name}`;
}

function matchesCapabilityKeyword(
  capability: SystemServiceAuthCapabilityDTO,
  keyword: string,
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const routeHaystack = capability.routes.map(routeText).join(" ");

  const haystack = [
    capability.target_app_code,
    capability.target_app_name,
    capability.capability_code,
    capability.capability_name,
    capability.resource_code,
    capability.permission_code,
    capability.description ?? "",
    routeHaystack,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function matchesPermissionKeyword(
  permission: SystemServiceAuthPermissionDTO,
  keyword: string,
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const haystack = [
    permission.client_code ?? "",
    permission.source_app_code,
    permission.source_app_name,
    permission.target_app_code,
    permission.target_app_name,
    permission.permission_code,
    permission.description,
    permission.capability_code ?? "",
    permission.capability_name ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function matchesWriteStatusKeyword(
  item: SystemServiceAuthWriteStatusItemDTO,
  keyword: string,
): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  const latestRun = item.latest_run;
  const haystack = [
    item.client_code ?? "",
    item.source_app_code,
    item.source_app_name,
    item.target_app_code,
    item.target_app_name,
    item.permission_code,
    item.description,
    latestRun?.operation ?? "",
    latestRun?.status ?? "",
    latestRun?.error_message ?? "",
    latestRun?.raw_excerpt ?? "",
    String(latestRun?.http_status ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function matchesWriteStatusFilter(
  item: SystemServiceAuthWriteStatusItemDTO,
  filter: WriteStatusFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "no-run") {
    return item.latest_run === null;
  }

  const status = item.latest_run?.status;
  if (filter === "pending") {
    return status === "pending" || status === "running";
  }

  return status === filter;
}

function toPermissionDraft(permission: SystemServiceAuthPermissionDTO): PermissionDraft {
  return {
    description: permission.description,
    is_active: permission.is_active,
  };
}

function isPermissionDraftDirty(
  permission: SystemServiceAuthPermissionDTO,
  draft: PermissionDraft,
): boolean {
  const original = toPermissionDraft(permission);

  return original.description !== draft.description || original.is_active !== draft.is_active;
}

function requireTrimmed(value: string, message: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(message);
  }

  return trimmed;
}

function parseClientId(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("请选择来源 Service Client");
  }

  return parsed;
}

function buildTargetOptions(
  capabilityOptions: SystemServiceAuthCapabilityOptionDTO[],
): TargetAppOption[] {
  const map = new Map<string, string>();

  for (const option of capabilityOptions) {
    map.set(option.target_app_code, option.target_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function buildSourceOptionsFromItems(items: SystemServiceAuthWriteStatusItemDTO[]): TargetAppOption[] {
  const map = new Map<string, string>();

  for (const item of items) {
    map.set(item.source_app_code, item.source_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function buildTargetOptionsFromItems(items: SystemServiceAuthWriteStatusItemDTO[]): TargetAppOption[] {
  const map = new Map<string, string>();

  for (const item of items) {
    map.set(item.target_app_code, item.target_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function capabilityOptionLabel(option: SystemServiceAuthCapabilityOptionDTO): string {
  return `${option.permission_code} · ${option.capability_name}`;
}

function filterCapabilityOptionsByTarget(
  capabilityOptions: SystemServiceAuthCapabilityOptionDTO[],
  targetAppCode: string,
): SystemServiceAuthCapabilityOptionDTO[] {
  return capabilityOptions.filter((option) => option.target_app_code === targetAppCode);
}

function findCapabilityOption(
  capabilityOptions: SystemServiceAuthCapabilityOptionDTO[],
  targetAppCode: string,
  permissionCode: string,
): SystemServiceAuthCapabilityOptionDTO | null {
  return (
    capabilityOptions.find(
      (option) =>
        option.target_app_code === targetAppCode && option.permission_code === permissionCode,
    ) ?? null
  );
}

function CapabilityRoutes({ routes }: { routes: SystemServiceAuthCapabilityRouteDTO[] }) {
  if (routes.length === 0) {
    return <span className="admin-apps-muted">暂无路由</span>;
  }

  return (
    <div className="admin-apps-stack">
      {routes.map((route) => (
        <div key={`${route.http_method}-${route.path}`} className="admin-apps-muted">
          <div className="admin-apps-code">
            {route.http_method} {route.path}
          </div>
          <div>{route.route_name}</div>
          <div>
            认证：{route.auth_required ? "需要" : "不需要"}；状态：
            {route.is_active ? "启用" : "停用"}；同步：
            {formatDateTime(route.last_synced_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityCatalogTable({
  capabilities,
  loading,
  onRefresh,
}: {
  capabilities: SystemServiceAuthCapabilityDTO[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (capabilities.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>目标系统能力清单</h2>
            <p>暂无能力目录数据。请先在独立系统列表中同步业务系统自描述。</p>
          </div>
          <div className="admin-apps-row-actions">
            <button
              type="button"
              className="admin-apps-button secondary"
              disabled={loading}
              onClick={onRefresh}
            >
              刷新
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>目标系统能力清单</h2>
          <p>
            只读展示各目标系统通过 self-description 声明的 service capabilities 和 route mappings。
          </p>
        </div>
        <div className="admin-apps-row-actions">
          <button
            type="button"
            className="admin-apps-button secondary"
            disabled={loading}
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
              <th>目标系统</th>
              <th>能力</th>
              <th>权限 / 资源</th>
              <th>路由</th>
              <th>状态</th>
              <th>同步时间</th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((capability) => (
              <tr key={`${capability.target_app_code}-${capability.capability_code}`}>
                <td>
                  <div className="admin-apps-code">{capability.target_app_code}</div>
                  <div>{capability.target_app_name}</div>
                </td>
                <td>
                  <div className="admin-apps-code">{capability.capability_code}</div>
                  <div>{capability.capability_name}</div>
                  <div className="admin-apps-muted">{emptyText(capability.description)}</div>
                </td>
                <td>
                  <div>{capability.permission_code}</div>
                  <div className="admin-apps-muted">resource: {capability.resource_code}</div>
                </td>
                <td>
                  <div className="admin-apps-muted">共 {capability.route_count} 条</div>
                  <CapabilityRoutes routes={capability.routes} />
                </td>
                <td>
                  <BoolPill active={capability.is_active} />
                </td>
                <td>
                  <div>{formatDateTime(capability.last_synced_at)}</div>
                  <div className="admin-apps-muted">
                    源更新时间：{formatDateTime(capability.source_updated_at)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemServiceAuthCapabilitiesPanel() {
  const { token, user } = useSessionRuntime();
  const [keyword, setKeyword] = useState("");

  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const {
    capabilities,
    targetOptions,
    targetAppCode,
    setTargetAppCode,
    loading,
    error,
    reload,
  } = useSystemServiceAuthCapabilities(token);

  const filteredCapabilities = useMemo(
    () => capabilities.filter((capability) => matchesCapabilityKeyword(capability, keyword)),
    [capabilities, keyword],
  );

  if (!canRead) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>无访问权限</h2>
            <p>当前账号无系统协作配置访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载能力目录…</div> : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>能力目录筛选</h2>
            <p>按目标系统或关键字查看 ERP 已同步的服务能力声明。</p>
          </div>
          <div className="admin-apps-toolbar">
            <select
              value={targetAppCode}
              onChange={(event) => setTargetAppCode(event.target.value)}
            >
              <option value="">全部目标系统</option>
              {targetOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <input
              placeholder="搜索能力 / 权限 / 路由"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <CapabilityCatalogTable
        capabilities={filteredCapabilities}
        loading={loading}
        onRefresh={() => {
          void reload();
        }}
      />
    </div>
  );
}

function PermissionCreatePanel({
  clients,
  capabilityOptions,
  creating,
  onCreate,
}: {
  clients: SystemServiceAuthClientDTO[];
  capabilityOptions: SystemServiceAuthCapabilityOptionDTO[];
  creating: boolean;
  onCreate: (payload: {
    clientId: number;
    targetAppCode: string;
    permissionCode: string;
    description: string;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [clientId, setClientId] = useState("");
  const [targetAppCode, setTargetAppCode] = useState("");
  const [permissionCode, setPermissionCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);

  const targetOptions = useMemo(() => buildTargetOptions(capabilityOptions), [capabilityOptions]);

  const selectedClientId = clientId || (clients[0] ? String(clients[0].client_id) : "");
  const selectedTargetAppCode =
    targetAppCode || (targetOptions[0] ? targetOptions[0].code : "");

  const targetCapabilityOptions = useMemo(
    () => filterCapabilityOptionsByTarget(capabilityOptions, selectedTargetAppCode),
    [capabilityOptions, selectedTargetAppCode],
  );

  const selectedPermissionCode =
    permissionCode && targetCapabilityOptions.some((option) => option.permission_code === permissionCode)
      ? permissionCode
      : targetCapabilityOptions[0]?.permission_code ?? "";

  const selectedCapability = findCapabilityOption(
    capabilityOptions,
    selectedTargetAppCode,
    selectedPermissionCode,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalDescription =
      description.trim() ||
      selectedCapability?.description ||
      selectedCapability?.capability_name ||
      "";

    await onCreate({
      clientId: parseClientId(selectedClientId),
      targetAppCode: requireTrimmed(selectedTargetAppCode, "请选择目标系统"),
      permissionCode: requireTrimmed(selectedPermissionCode, "请选择目标能力"),
      description: requireTrimmed(finalDescription, "请填写授权说明"),
      isActive,
    });

    setDescription("");
    setIsActive(false);
  }

  return (
    <form className="admin-apps-card admin-apps-create-grid" onSubmit={handleSubmit}>
      <div className="admin-apps-form-intro">
        <h2>新增调用授权</h2>
        <p>只写入 ERP 本地授权表，不写入目标系统 service permission 表。</p>
      </div>

      <label>
        <span>来源 Client</span>
        <select
          value={selectedClientId}
          disabled={creating || clients.length === 0}
          onChange={(event) => setClientId(event.target.value)}
        >
          {clients.length === 0 ? <option value="">暂无 Service Client</option> : null}
          {clients.map((client) => (
            <option key={client.client_id} value={client.client_id}>
              {client.client_code} · {client.app_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>目标系统</span>
        <select
          value={selectedTargetAppCode}
          disabled={creating || targetOptions.length === 0}
          onChange={(event) => {
            setTargetAppCode(event.target.value);
            setPermissionCode("");
            setDescription("");
          }}
        >
          {targetOptions.length === 0 ? <option value="">暂无目标系统能力</option> : null}
          {targetOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} · {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-apps-wide">
        <span>目标能力</span>
        <select
          value={selectedPermissionCode}
          disabled={creating || targetCapabilityOptions.length === 0}
          onChange={(event) => {
            const nextPermissionCode = event.target.value;
            const nextCapability = findCapabilityOption(
              capabilityOptions,
              selectedTargetAppCode,
              nextPermissionCode,
            );

            setPermissionCode(nextPermissionCode);
            if (!description.trim()) {
              setDescription(nextCapability?.description ?? nextCapability?.capability_name ?? "");
            }
          }}
        >
          {targetCapabilityOptions.length === 0 ? <option value="">暂无可选能力</option> : null}
          {targetCapabilityOptions.map((option) => (
            <option key={`${option.target_app_code}-${option.permission_code}`} value={option.permission_code}>
              {capabilityOptionLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-apps-check">
        <input
          type="checkbox"
          checked={isActive}
          disabled={creating}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        <span>本地启用</span>
      </label>

      <label className="admin-apps-wide">
        <span>授权说明</span>
        <input
          placeholder={selectedCapability?.description ?? "说明该授权的业务用途"}
          value={description}
          disabled={creating}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <button
        type="submit"
        className="admin-apps-button primary"
        disabled={
          creating ||
          clients.length === 0 ||
          targetOptions.length === 0 ||
          targetCapabilityOptions.length === 0
        }
      >
        {creating ? "创建中…" : "创建授权"}
      </button>
    </form>
  );
}

function PermissionTable({
  permissions,
  drafts,
  loading,
  mutating,
  canManage,
  onPatchDraft,
  onSave,
  onRefresh,
}: {
  permissions: SystemServiceAuthPermissionDTO[];
  drafts: PermissionDraftMap;
  loading: boolean;
  mutating: boolean;
  canManage: boolean;
  onPatchDraft: (permissionId: number, patch: Partial<PermissionDraft>) => void;
  onSave: (permission: SystemServiceAuthPermissionDTO) => Promise<void>;
  onRefresh: () => void;
}) {
  if (permissions.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>调用授权列表</h2>
            <p>暂无调用授权。请先创建本地授权记录。</p>
          </div>
          <div className="admin-apps-row-actions">
            <button
              type="button"
              className="admin-apps-button secondary"
              disabled={loading || mutating}
              onClick={onRefresh}
            >
              刷新
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>调用授权列表</h2>
          <p>只管理 ERP 本地授权记录；是否已写入目标系统由“写入状态”页面处理。</p>
        </div>
        <div className="admin-apps-row-actions">
          <button
            type="button"
            className="admin-apps-button secondary"
            disabled={loading || mutating}
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
              <th>来源 Client</th>
              <th>目标系统</th>
              <th>权限 / 能力</th>
              <th>授权说明</th>
              <th>本地状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => {
              const draft = drafts[permission.permission_id] ?? toPermissionDraft(permission);
              const dirty = isPermissionDraftDirty(permission, draft);
              const capabilityMatched = permission.capability_code !== null;

              return (
                <tr key={permission.permission_id}>
                  <td>
                    <div className="admin-apps-code">
                      {permission.client_code ?? `client:${permission.client_id}`}
                    </div>
                    <div>{permission.source_app_name}</div>
                    <div className="admin-apps-muted">{permission.source_app_code}</div>
                  </td>
                  <td>
                    <div className="admin-apps-code">{permission.target_app_code}</div>
                    <div>{permission.target_app_name}</div>
                  </td>
                  <td>
                    <div>{permission.permission_code}</div>
                    {capabilityMatched ? (
                      <>
                        <div className="admin-apps-muted">{permission.capability_code}</div>
                        <div className="admin-apps-muted">{permission.capability_name}</div>
                        {permission.capability_active === false ? (
                          <WarningPill text="目标能力停用" />
                        ) : null}
                      </>
                    ) : (
                      <WarningPill text="未匹配目标能力" />
                    )}
                  </td>
                  <td>
                    <textarea
                      value={draft.description}
                      disabled={!canManage || mutating}
                      onChange={(event) =>
                        onPatchDraft(permission.permission_id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <label className="admin-apps-check">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        disabled={!canManage || mutating}
                        onChange={(event) =>
                          onPatchDraft(permission.permission_id, {
                            is_active: event.target.checked,
                          })
                        }
                      />
                      <span>{draft.is_active ? "启用" : "停用"}</span>
                    </label>
                    <div>
                      <BoolPill active={permission.is_active} />
                    </div>
                  </td>
                  <td>
                    <div>{formatDateTime(permission.updated_at)}</div>
                    <div className="admin-apps-muted">
                      创建：{formatDateTime(permission.created_at)}
                    </div>
                    {dirty ? <div className="admin-apps-muted">本行有未保存修改</div> : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-apps-button secondary"
                      disabled={!canManage || mutating || !dirty}
                      onClick={() => {
                        void onSave(permission);
                      }}
                    >
                      保存
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

function SystemServiceAuthPermissionsPanel() {
  const { token, user } = useSessionRuntime();
  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    clients,
    capabilityOptions,
    permissions,
    loading,
    mutating,
    error,
    reload,
    createPermission,
    updatePermission,
    setError,
  } = useSystemServiceAuthPermissions(token);

  const [keyword, setKeyword] = useState("");
  const [sourceAppCode, setSourceAppCode] = useState("");
  const [targetAppCode, setTargetAppCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<PermissionDraftMap>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextDrafts: PermissionDraftMap = {};
      for (const permission of permissions) {
        nextDrafts[permission.permission_id] = toPermissionDraft(permission);
      }
      setDrafts(nextDrafts);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [permissions]);

  const sourceOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clients) {
      map.set(client.app_code, client.app_name);
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((left, right) => left.code.localeCompare(right.code));
  }, [clients]);

  const targetOptions = useMemo(() => buildTargetOptions(capabilityOptions), [capabilityOptions]);

  const filteredPermissions = useMemo(
    () =>
      permissions.filter((permission) => {
        if (sourceAppCode && permission.source_app_code !== sourceAppCode) return false;
        if (targetAppCode && permission.target_app_code !== targetAppCode) return false;
        if (activeFilter === "active" && !permission.is_active) return false;
        if (activeFilter === "inactive" && permission.is_active) return false;
        return matchesPermissionKeyword(permission, keyword);
      }),
    [activeFilter, keyword, permissions, sourceAppCode, targetAppCode],
  );

  function patchDraft(permissionId: number, patch: Partial<PermissionDraft>) {
    if (!canManage) return;

    const permission = permissions.find((item) => item.permission_id === permissionId);
    if (!permission) return;

    setDrafts((prev) => ({
      ...prev,
      [permissionId]: {
        ...(prev[permissionId] ?? toPermissionDraft(permission)),
        ...patch,
      },
    }));
  }

  async function handleCreate(payload: {
    clientId: number;
    targetAppCode: string;
    permissionCode: string;
    description: string;
    isActive: boolean;
  }) {
    if (!canManage) return;

    try {
      await createPermission({
        client_id: payload.clientId,
        target_app_code: payload.targetAppCode,
        permission_code: payload.permissionCode,
        description: payload.description,
        is_active: payload.isActive,
      });
      setMessage("调用授权已创建");
    } catch (currentError) {
      setMessage(null);
      setError(currentError instanceof Error ? currentError.message : "创建调用授权失败");
    }
  }

  async function handleSave(permission: SystemServiceAuthPermissionDTO) {
    if (!canManage) return;

    const draft = drafts[permission.permission_id] ?? toPermissionDraft(permission);

    try {
      await updatePermission(permission.permission_id, {
        description: requireTrimmed(draft.description, "请填写授权说明"),
        is_active: draft.is_active,
      });
      setMessage("调用授权已保存");
    } catch (currentError) {
      setMessage(null);
      setError(currentError instanceof Error ? currentError.message : "保存调用授权失败");
    }
  }

  if (!canRead) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>无访问权限</h2>
            <p>当前账号无系统协作配置访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {message ? <div className="admin-apps-alert">{message}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载调用授权…</div> : null}
      {!canManage ? <div className="admin-apps-alert">当前为只读模式，不能创建或修改调用授权。</div> : null}

      {canManage ? (
        <PermissionCreatePanel
          clients={clients}
          capabilityOptions={capabilityOptions}
          creating={mutating}
          onCreate={handleCreate}
        />
      ) : null}

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>调用授权筛选</h2>
            <p>按来源系统、目标系统、启停状态或关键字筛选本地授权记录。</p>
          </div>
          <div className="admin-apps-toolbar">
            <select value={sourceAppCode} onChange={(event) => setSourceAppCode(event.target.value)}>
              <option value="">全部来源系统</option>
              {sourceOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <select value={targetAppCode} onChange={(event) => setTargetAppCode(event.target.value)}>
              <option value="">全部目标系统</option>
              {targetOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}>
              <option value="all">全部启停</option>
              <option value="active">仅启用</option>
              <option value="inactive">仅停用</option>
            </select>
            <input
              placeholder="搜索 client / 权限 / 能力"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <PermissionTable
        permissions={filteredPermissions}
        drafts={drafts}
        loading={loading}
        mutating={mutating}
        canManage={canManage}
        onPatchDraft={patchDraft}
        onSave={handleSave}
        onRefresh={() => {
          void reload();
        }}
      />
    </div>
  );
}

function WriteStatusSummary({
  items,
  recentRuns,
}: {
  items: SystemServiceAuthWriteStatusItemDTO[];
  recentRuns: SystemServiceAuthWriteRunDTO[];
}) {
  const activePermissions = items.filter((item) => item.permission_active).length;
  const successCount = items.filter((item) => item.latest_run?.status === "success").length;
  const failureCount = items.filter((item) => item.latest_run?.status === "failure").length;
  const pendingCount = items.filter(
    (item) => item.latest_run?.status === "pending" || item.latest_run?.status === "running",
  ).length;
  const noRunCount = items.filter((item) => item.latest_run === null).length;

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>本地授权</span>
          <strong>{items.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>本地启用</span>
          <strong>{activePermissions}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>写入成功</span>
          <strong>{successCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>写入失败</span>
          <strong>{failureCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>待执行 / 执行中</span>
          <strong>{pendingCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>未写入</span>
          <strong>{noRunCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>最近记录</span>
          <strong>{recentRuns.length}</strong>
        </article>
      </div>
    </section>
  );
}

function WriteStatusTable({
  items,
  loading,
  onRefresh,
}: {
  items: SystemServiceAuthWriteStatusItemDTO[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (items.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>写入状态</h2>
            <p>暂无本地授权记录。请先在“调用授权”页面创建授权。</p>
          </div>
          <div className="admin-apps-row-actions">
            <button
              type="button"
              className="admin-apps-button secondary"
              disabled={loading}
              onClick={onRefresh}
            >
              刷新
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>写入状态</h2>
          <p>展示每条本地调用授权的最近一次写入记录。当前页面只读，不触发写回。</p>
        </div>
        <div className="admin-apps-row-actions">
          <button
            type="button"
            className="admin-apps-button secondary"
            disabled={loading}
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
              <th>授权</th>
              <th>目标系统</th>
              <th>本地状态</th>
              <th>最近写入</th>
              <th>目标响应</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const run = item.latest_run;

              return (
                <tr key={item.permission_id}>
                  <td>
                    <div className="admin-apps-code">{item.permission_code}</div>
                    <div>{item.description}</div>
                    <div className="admin-apps-muted">
                      {item.client_code ?? `client:${item.client_id}`} · {item.source_app_name}
                    </div>
                  </td>
                  <td>
                    <div className="admin-apps-code">{item.target_app_code}</div>
                    <div>{item.target_app_name}</div>
                  </td>
                  <td>
                    <BoolPill active={item.permission_active} />
                  </td>
                  <td>
                    <WriteStatusPill run={run} />
                    {run ? (
                      <div className="admin-apps-muted">
                        {operationText(run.operation)} · {run.status}
                      </div>
                    ) : (
                      <div className="admin-apps-muted">尚未产生写入执行记录</div>
                    )}
                  </td>
                  <td>
                    {run ? (
                      <>
                        <div>HTTP：{emptyText(run.http_status)}</div>
                        <div className="admin-apps-muted">
                          目标：{emptyText(run.target_base_url)}
                        </div>
                        {run.error_message ? (
                          <div className="admin-apps-muted">错误：{run.error_message}</div>
                        ) : null}
                        {run.raw_excerpt ? (
                          <div className="admin-apps-muted">摘要：{run.raw_excerpt}</div>
                        ) : null}
                      </>
                    ) : (
                      <span className="admin-apps-muted">暂无目标响应</span>
                    )}
                  </td>
                  <td>
                    {run ? (
                      <>
                        <div>开始：{formatDateTime(run.started_at)}</div>
                        <div className="admin-apps-muted">
                          完成：{formatDateTime(run.finished_at)}
                        </div>
                      </>
                    ) : (
                      <span className="admin-apps-muted">暂无</span>
                    )}
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

function RecentWriteRunsTable({ runs }: { runs: SystemServiceAuthWriteRunDTO[] }) {
  if (runs.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>最近写入记录</h2>
            <p>暂无写入记录。后续写回执行服务上线后会在这里显示执行历史。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>最近写入记录</h2>
          <p>按执行时间倒序展示最近写入记录。</p>
        </div>
      </div>

      <div className="admin-apps-table-wrap">
        <table className="admin-apps-table">
          <thead>
            <tr>
              <th>Run</th>
              <th>授权</th>
              <th>操作 / 状态</th>
              <th>目标</th>
              <th>响应</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.run_id}>
                <td>
                  <div className="admin-apps-code">#{run.run_id}</div>
                  <div className="admin-apps-muted">permission #{run.permission_id}</div>
                </td>
                <td>
                  <div className="admin-apps-code">{run.permission_code}</div>
                  <div className="admin-apps-muted">
                    {run.client_code ?? "-"} · {run.source_app_code} → {run.target_app_code}
                  </div>
                </td>
                <td>
                  <WriteStatusPill run={run} />
                  <div className="admin-apps-muted">{operationText(run.operation)}</div>
                </td>
                <td>{emptyText(run.target_base_url)}</td>
                <td>
                  <div>HTTP：{emptyText(run.http_status)}</div>
                  {run.error_message ? (
                    <div className="admin-apps-muted">错误：{run.error_message}</div>
                  ) : null}
                </td>
                <td>
                  <div>开始：{formatDateTime(run.started_at)}</div>
                  <div className="admin-apps-muted">完成：{formatDateTime(run.finished_at)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SystemServiceAuthWriteStatusPanel() {
  const { token, user } = useSessionRuntime();
  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const { items, recentRuns, loading, error, reload } = useSystemServiceAuthWriteStatus(token);

  const [keyword, setKeyword] = useState("");
  const [sourceAppCode, setSourceAppCode] = useState("");
  const [targetAppCode, setTargetAppCode] = useState("");
  const [statusFilter, setStatusFilter] = useState<WriteStatusFilter>("all");

  const sourceOptions = useMemo(() => buildSourceOptionsFromItems(items), [items]);
  const targetOptions = useMemo(() => buildTargetOptionsFromItems(items), [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (sourceAppCode && item.source_app_code !== sourceAppCode) return false;
        if (targetAppCode && item.target_app_code !== targetAppCode) return false;
        if (!matchesWriteStatusFilter(item, statusFilter)) return false;
        return matchesWriteStatusKeyword(item, keyword);
      }),
    [items, keyword, sourceAppCode, statusFilter, targetAppCode],
  );

  if (!canRead) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>无访问权限</h2>
            <p>当前账号无系统协作配置访问权限。</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="admin-apps-stack">
      {error ? <div className="admin-apps-alert danger">{error}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载写入状态…</div> : null}

      <WriteStatusSummary items={items} recentRuns={recentRuns} />

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>写入状态筛选</h2>
            <p>按来源系统、目标系统、写入状态或关键字筛选本地授权写入状态。</p>
          </div>
          <div className="admin-apps-toolbar">
            <select value={sourceAppCode} onChange={(event) => setSourceAppCode(event.target.value)}>
              <option value="">全部来源系统</option>
              {sourceOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <select value={targetAppCode} onChange={(event) => setTargetAppCode(event.target.value)}>
              <option value="">全部目标系统</option>
              {targetOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as WriteStatusFilter)}
            >
              <option value="all">全部写入状态</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
              <option value="pending">待执行 / 执行中</option>
              <option value="skipped">跳过</option>
              <option value="no-run">未写入</option>
            </select>
            <input
              placeholder="搜索 client / 权限 / 响应"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <WriteStatusTable
        items={filteredItems}
        loading={loading}
        onRefresh={() => {
          void reload();
        }}
      />

      <RecentWriteRunsTable runs={recentRuns} />
    </div>
  );
}

export function SystemServiceAuthCapabilitiesPage() {
  return <SystemServiceAuthCapabilitiesPanel />;
}

export function SystemServiceAuthPermissionsPage() {
  return <SystemServiceAuthPermissionsPanel />;
}

export function SystemServiceAuthWriteStatusPage() {
  return <SystemServiceAuthWriteStatusPanel />;
}
