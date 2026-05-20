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
type CapabilityStatusFilter = "all" | "active" | "inactive";
type WriteStatusFilter = "all" | "apply-success" | "verify-success" | "apply-failure" | "verify-failure" | "no-apply" | "no-verify";

type PermissionDraft = {
  description: string;
  is_active: boolean;
};

type PermissionDraftMap = Record<number, PermissionDraft>;
type PermissionAction = "apply" | "verify" | "apply-verify";
type RunningPermissionAction = {
  action: PermissionAction;
  permissionId: number;
};

type PermissionActionResultStatus = "running" | "success" | "failure";

type PermissionActionResult = {
  action: PermissionAction | "save";
  status: PermissionActionResultStatus;
  message: string;
  detail?: string;
};

type PermissionActionResultMap = Record<number, PermissionActionResult>;


type TargetAppOption = {
  code: string;
  name: string;
};

const RESOURCE_LABELS: Record<string, string> = {
  barcodes: "商品条码",
  fulfillment_ready_orders: "可履约订单",
  health: "健康检查",
  iam_snapshot: "权限快照",
  items: "商品主数据",
  purchase_orders: "采购单",
  shipping_records: "物流记录",
  sku_codes: "SKU 编码",
  suppliers: "供应商",
  uoms: "计量单位",
  warehouses: "仓库",
};

function resourceText(value: string): string {
  const label = RESOURCE_LABELS[value];

  return label ? `${label}（${value}）` : value;
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

function CapabilityStatusPill({ active }: { active: boolean }) {
  return (
    <span className={active ? "admin-apps-status success" : "admin-apps-status muted"}>
      {active ? "提供中" : "已停用"}
    </span>
  );
}

function WarningPill({ text }: { text: string }) {
  return <span className="admin-apps-status muted">{text}</span>;
}

function permissionActionText(action: PermissionAction | "save"): string {
  const map: Record<PermissionAction | "save", string> = {
    "apply": "写入",
    "apply-verify": "写入并校验",
    "save": "保存",
    "verify": "校验",
  };

  return map[action];
}

function permissionActionStatusText(status: PermissionActionResultStatus): string {
  const map: Record<PermissionActionResultStatus, string> = {
    failure: "失败",
    running: "执行中",
    success: "成功",
  };

  return map[status];
}

function PermissionActionResultCell({
  result,
}: {
  result: PermissionActionResult | undefined;
}) {
  if (!result) {
    return <span className="admin-apps-muted">暂无本页操作</span>;
  }

  const className =
    result.status === "success" ? "admin-apps-status success" : "admin-apps-status muted";

  return (
    <div className="admin-apps-stack">
      <span className={className}>
        {permissionActionText(result.action)}
        {permissionActionStatusText(result.status)}
      </span>
      <div className="admin-apps-muted">{result.message}</div>
      {result.detail ? <div className="admin-apps-muted">{result.detail}</div> : null}
    </div>
  );
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

type LatestRunsByOperation = {
  applyByPermissionId: Map<number, SystemServiceAuthWriteRunDTO>;
  verifyByPermissionId: Map<number, SystemServiceAuthWriteRunDTO>;
};

function isApplyOperation(operation: string): boolean {
  return operation !== "verify";
}

function runStartedAtMillis(run: SystemServiceAuthWriteRunDTO): number {
  const parsed = Date.parse(run.started_at);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function pickLatestRun(
  current: SystemServiceAuthWriteRunDTO | undefined,
  next: SystemServiceAuthWriteRunDTO,
): SystemServiceAuthWriteRunDTO {
  if (!current) return next;

  return runStartedAtMillis(next) >= runStartedAtMillis(current) ? next : current;
}

function buildLatestRunsByOperation(runs: SystemServiceAuthWriteRunDTO[]): LatestRunsByOperation {
  const applyByPermissionId = new Map<number, SystemServiceAuthWriteRunDTO>();
  const verifyByPermissionId = new Map<number, SystemServiceAuthWriteRunDTO>();

  for (const run of runs) {
    if (isApplyOperation(run.operation)) {
      applyByPermissionId.set(
        run.permission_id,
        pickLatestRun(applyByPermissionId.get(run.permission_id), run),
      );
    } else {
      verifyByPermissionId.set(
        run.permission_id,
        pickLatestRun(verifyByPermissionId.get(run.permission_id), run),
      );
    }
  }

  return {
    applyByPermissionId,
    verifyByPermissionId,
  };
}

function compactExcerpt(value: string | null | undefined): string | null {
  if (!value) return null;

  return value.length > 220 ? `${value.slice(0, 220)}…` : value;
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
    resourceText(capability.resource_code),
    capability.permission_code,
    capability.description ?? "",
    capability.is_active ? "提供中" : "已停用",
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
  filter: WriteStatusFilter,
  latestApplyRun: SystemServiceAuthWriteRunDTO | null,
  latestVerifyRun: SystemServiceAuthWriteRunDTO | null,
): boolean {
  if (filter === "all") return true;

  if (filter === "apply-success") return latestApplyRun?.status === "success";
  if (filter === "verify-success") return latestVerifyRun?.status === "success";
  if (filter === "apply-failure") return latestApplyRun?.status === "failure";
  if (filter === "verify-failure") return latestVerifyRun?.status === "failure";
  if (filter === "no-apply") return latestApplyRun === null;
  if (filter === "no-verify") return latestVerifyRun === null;

  return true;
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
          <div>系统身份校验：{route.auth_required ? "需要" : "不需要"}</div>
          <div>接口状态：{route.is_active ? "提供中" : "已停用"}</div>
          <div>同步时间：{formatDateTime(route.last_synced_at)}</div>
        </div>
      ))}
    </div>
  );
}

function CapabilityDirectorySummary({
  capabilities,
}: {
  capabilities: SystemServiceAuthCapabilityDTO[];
}) {
  const targetSystemCount = new Set(capabilities.map((capability) => capability.target_app_code)).size;
  const activeCapabilityCount = capabilities.filter((capability) => capability.is_active).length;
  const inactiveCapabilityCount = capabilities.length - activeCapabilityCount;

  let routeCount = 0;
  let authRequiredRouteCount = 0;
  let inactiveRouteCount = 0;

  for (const capability of capabilities) {
    routeCount += capability.route_count;

    for (const route of capability.routes) {
      if (route.auth_required) authRequiredRouteCount += 1;
      if (!route.is_active) inactiveRouteCount += 1;
    }
  }

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>能力总数</span>
          <strong>{capabilities.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>提供中</span>
          <strong>{activeCapabilityCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>已停用</span>
          <strong>{inactiveCapabilityCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>目标系统</span>
          <strong>{targetSystemCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>接口路由</span>
          <strong>{routeCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>需系统身份</span>
          <strong>{authRequiredRouteCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>停用接口</span>
          <strong>{inactiveRouteCount}</strong>
        </article>
      </div>
    </section>
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
            只读展示目标系统声明的能力和接口；能力存在不代表已经授权，谁能调用以访问白名单为准。
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
              <th>调用权限 / 业务资源</th>
              <th>路由</th>
              <th>能力状态</th>
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
                  <div className="admin-apps-muted">资源：{resourceText(capability.resource_code)}</div>
                  <div className="admin-apps-muted">授权配置：访问白名单页</div>
                </td>
                <td>
                  <div className="admin-apps-muted">共 {capability.route_count} 条</div>
                  <CapabilityRoutes routes={capability.routes} />
                </td>
                <td>
                  <CapabilityStatusPill active={capability.is_active} />
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
  const [statusFilter, setStatusFilter] = useState<CapabilityStatusFilter>("all");

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
    () =>
      capabilities.filter((capability) => {
        if (statusFilter === "active" && !capability.is_active) return false;
        if (statusFilter === "inactive" && capability.is_active) return false;

        return matchesCapabilityKeyword(capability, keyword);
      }),
    [capabilities, keyword, statusFilter],
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

      <CapabilityDirectorySummary capabilities={capabilities} />

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>能力目录筛选</h2>
            <p>按目标系统、能力状态或关键字查看 ERP 已同步的服务能力声明。</p>
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
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CapabilityStatusFilter)}
            >
              <option value="all">全部状态</option>
              <option value="active">仅提供中</option>
              <option value="inactive">仅已停用</option>
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

function AccessWhitelistSummary({
  clients,
  capabilityOptions,
  permissions,
}: {
  clients: SystemServiceAuthClientDTO[];
  capabilityOptions: SystemServiceAuthCapabilityOptionDTO[];
  permissions: SystemServiceAuthPermissionDTO[];
}) {
  const activePermissionCount = permissions.filter((permission) => permission.is_active).length;
  const inactivePermissionCount = permissions.length - activePermissionCount;
  const matchedCapabilityCount = permissions.filter(
    (permission) => permission.capability_code !== null,
  ).length;
  const missingCapabilityCount = permissions.length - matchedCapabilityCount;
  const sourceSystemCount = new Set(permissions.map((permission) => permission.source_app_code)).size;
  const targetSystemCount = new Set(permissions.map((permission) => permission.target_app_code)).size;
  const activeClientCount = clients.filter((client) => client.is_active).length;

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>白名单总数</span>
          <strong>{permissions.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>本地启用</span>
          <strong>{activePermissionCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>本地停用</span>
          <strong>{inactivePermissionCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>来源系统</span>
          <strong>{sourceSystemCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>目标系统</span>
          <strong>{targetSystemCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>系统身份</span>
          <strong>{clients.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>启用身份</span>
          <strong>{activeClientCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>可授权能力</span>
          <strong>{capabilityOptions.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>能力匹配</span>
          <strong>{matchedCapabilityCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>缺目标能力</span>
          <strong>{missingCapabilityCount}</strong>
        </article>
      </div>
    </section>
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
      description: requireTrimmed(finalDescription, "请填写白名单说明"),
      isActive,
    });

    setDescription("");
    setIsActive(false);
  }

  return (
    <form className="admin-apps-card admin-apps-create-grid" onSubmit={handleSubmit}>
      <div className="admin-apps-form-intro">
        <h2>新增访问白名单</h2>
        <p>只写入 ERP 本地白名单表；创建后可在本页对该条白名单执行写入、校验或写入并校验，完整执行历史见“写入与校验记录”页面。</p>
      </div>

      <label>
        <span>来源系统身份</span>
        <select
          value={selectedClientId}
          disabled={creating || clients.length === 0}
          onChange={(event) => setClientId(event.target.value)}
        >
          {clients.length === 0 ? <option value="">暂无 Service Client</option> : null}
          {clients.map((client) => (
            <option key={client.client_id} value={client.client_id}>
              {client.client_code} · {client.app_name} · {client.is_active ? "身份启用" : "身份停用"}
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
        <span>目标能力 / 调用权限</span>
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
        <span>创建后本地启用</span>
      </label>

      <label className="admin-apps-wide">
        <span>白名单说明</span>
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
        {creating ? "创建中…" : "创建白名单"}
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
  actionResults,
  runningAction,
  onApply,
  onApplyAndVerify,
  onPatchDraft,
  onSave,
  onRefresh,
  onVerify,
}: {
  permissions: SystemServiceAuthPermissionDTO[];
  drafts: PermissionDraftMap;
  loading: boolean;
  mutating: boolean;
  canManage: boolean;
  actionResults: PermissionActionResultMap;
  runningAction: RunningPermissionAction | null;
  onApply: (permissionId: number) => Promise<void>;
  onApplyAndVerify: (permissionId: number) => Promise<void>;
  onPatchDraft: (permissionId: number, patch: Partial<PermissionDraft>) => void;
  onSave: (permission: SystemServiceAuthPermissionDTO) => Promise<void>;
  onRefresh: () => void;
  onVerify: (permissionId: number) => Promise<void>;
}) {
  if (permissions.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>访问白名单列表</h2>
            <p>暂无访问白名单。请先创建 ERP 本地白名单记录。</p>
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
          <h2>访问白名单列表</h2>
          <p>管理 ERP 本地白名单记录；本页可对单条白名单执行写入、校验或写入并校验，完整执行历史见“写入与校验记录”页面。</p>
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
              <th>来源系统身份</th>
              <th>目标系统</th>
              <th>调用权限 / 目标能力</th>
              <th>白名单说明</th>
              <th>ERP 本地状态</th>
              <th>操作结果</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => {
              const draft = drafts[permission.permission_id] ?? toPermissionDraft(permission);
              const dirty = isPermissionDraftDirty(permission, draft);
              const capabilityMatched = permission.capability_code !== null;
              const rowAction =
                runningAction?.permissionId === permission.permission_id ? runningAction.action : null;
              const commandDisabled = !canManage || mutating || dirty || rowAction !== null;
              const actionResult = actionResults[permission.permission_id];

              return (
                <tr key={permission.permission_id}>
                  <td>
                    <div className="admin-apps-code">
                      {permission.client_code ?? `client:${permission.client_id}`}
                    </div>
                    <div>{permission.source_app_name}</div>
                    <div className="admin-apps-muted">来源系统：{permission.source_app_code}</div>
                    <div className="admin-apps-muted">client #{permission.client_id}</div>
                  </td>
                  <td>
                    <div className="admin-apps-code">{permission.target_app_code}</div>
                    <div>{permission.target_app_name}</div>
                  </td>
                  <td>
                    <div className="admin-apps-code">{permission.permission_code}</div>
                    <div className="admin-apps-muted">调用授权码</div>
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
                      <span>{draft.is_active ? "本地启用" : "本地停用"}</span>
                    </label>
                    <div className="admin-apps-muted">
                      当前保存状态：{permission.is_active ? "启用" : "停用"}
                    </div>
                    <div>
                      <BoolPill active={permission.is_active} />
                    </div>
                  </td>
                  <td>
                    <PermissionActionResultCell result={actionResult} />
                  </td>
                  <td>
                    <div>{formatDateTime(permission.updated_at)}</div>
                    <div className="admin-apps-muted">
                      创建：{formatDateTime(permission.created_at)}
                    </div>
                    {dirty ? <div className="admin-apps-muted">本行有未保存修改</div> : null}
                  </td>
                  <td>
                    <div className="admin-apps-row-actions">
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
                      <button
                        type="button"
                        className="admin-apps-button secondary"
                        disabled={commandDisabled}
                        onClick={() => {
                          void onApply(permission.permission_id);
                        }}
                      >
                        {rowAction === "apply" ? "写入中…" : "写入"}
                      </button>
                      <button
                        type="button"
                        className="admin-apps-button secondary"
                        disabled={commandDisabled}
                        onClick={() => {
                          void onVerify(permission.permission_id);
                        }}
                      >
                        {rowAction === "verify" ? "校验中…" : "校验"}
                      </button>
                      <button
                        type="button"
                        className="admin-apps-button secondary"
                        disabled={commandDisabled}
                        onClick={() => {
                          void onApplyAndVerify(permission.permission_id);
                        }}
                      >
                        {rowAction === "apply-verify" ? "执行中…" : "写入并校验"}
                      </button>
                    </div>
                    {dirty ? <div className="admin-apps-muted">先保存本行修改，再写入或校验。</div> : null}
                    {!canManage ? <div className="admin-apps-muted">只读账号不能执行命令。</div> : null}
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
    applyPermission,
    verifyPermission,
    setError,
  } = useSystemServiceAuthPermissions(token);

  const [keyword, setKeyword] = useState("");
  const [sourceAppCode, setSourceAppCode] = useState("");
  const [targetAppCode, setTargetAppCode] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [drafts, setDrafts] = useState<PermissionDraftMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<RunningPermissionAction | null>(null);
  const [actionResults, setActionResults] = useState<PermissionActionResultMap>({});

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

  function setPermissionActionResult(
    permissionId: number,
    result: PermissionActionResult,
  ): void {
    setActionResults((prev) => ({
      ...prev,
      [permissionId]: result,
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
      setMessage("访问白名单已创建");
    } catch (currentError) {
      setMessage(null);
      setError(currentError instanceof Error ? currentError.message : "创建访问白名单失败");
    }
  }

  async function handleSave(permission: SystemServiceAuthPermissionDTO) {
    if (!canManage) return;

    const draft = drafts[permission.permission_id] ?? toPermissionDraft(permission);

    setPermissionActionResult(permission.permission_id, {
      action: "save",
      status: "running",
      message: "正在保存 ERP 本地白名单…",
    });

    try {
      await updatePermission(permission.permission_id, {
        description: requireTrimmed(draft.description, "请填写白名单说明"),
        is_active: draft.is_active,
      });
      setPermissionActionResult(permission.permission_id, {
        action: "save",
        status: "success",
        message: "ERP 本地白名单已保存。",
      });
      setMessage("访问白名单已保存");
    } catch (currentError) {
      const detail = currentError instanceof Error ? currentError.message : "保存访问白名单失败";
      setPermissionActionResult(permission.permission_id, {
        action: "save",
        status: "failure",
        message: "保存失败。",
        detail,
      });
      setMessage(null);
      setError(detail);
    }
  }

  async function runPermissionAction(
    permissionId: number,
    action: PermissionAction,
  ): Promise<void> {
    if (!canManage) return;

    setRunningAction({ permissionId, action });
    setMessage(null);
    setActionError(null);
    setPermissionActionResult(permissionId, {
      action,
      status: "running",
      message: `${permissionActionText(action)}正在执行…`,
    });

    try {
      if (action === "apply") {
        const run = await applyPermission(permissionId);
        const success = run.status === "success";
        setPermissionActionResult(permissionId, {
          action,
          status: success ? "success" : "failure",
          message: `写入完成：${writeStatusText(run.status)}。`,
          detail: `HTTP ${emptyText(run.http_status)} · ${emptyText(run.target_base_url)}`,
        });
        setMessage(`permission #${permissionId} 写入完成：${run.status}`);
      } else if (action === "verify") {
        const run = await verifyPermission(permissionId);
        const success = run.status === "success";
        setPermissionActionResult(permissionId, {
          action,
          status: success ? "success" : "failure",
          message: `校验完成：${writeStatusText(run.status)}。`,
          detail: `HTTP ${emptyText(run.http_status)} · ${emptyText(run.target_base_url)}`,
        });
        setMessage(`permission #${permissionId} 校验完成：${run.status}`);
      } else {
        const applyRun = await applyPermission(permissionId);

        if (applyRun.status !== "success") {
          setPermissionActionResult(permissionId, {
            action,
            status: "failure",
            message: `写入完成：${writeStatusText(applyRun.status)}，未继续校验。`,
            detail: `HTTP ${emptyText(applyRun.http_status)} · ${emptyText(applyRun.target_base_url)}`,
          });
          setMessage(`permission #${permissionId} 写入完成：${applyRun.status}，未继续校验`);
          return;
        }

        const verifyRun = await verifyPermission(permissionId);
        const success = verifyRun.status === "success";
        setPermissionActionResult(permissionId, {
          action,
          status: success ? "success" : "failure",
          message: `写入成功，校验完成：${writeStatusText(verifyRun.status)}。`,
          detail: `HTTP ${emptyText(verifyRun.http_status)} · ${emptyText(verifyRun.target_base_url)}`,
        });
        setMessage(`permission #${permissionId} 写入成功，校验完成：${verifyRun.status}`);
      }
    } catch (currentError) {
      const detail = currentError instanceof Error ? currentError.message : "执行写入与校验命令失败";
      setPermissionActionResult(permissionId, {
        action,
        status: "failure",
        message: `${permissionActionText(action)}失败。`,
        detail,
      });
      setActionError(detail);
    } finally {
      setRunningAction(null);
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
      {actionError ? <div className="admin-apps-alert danger">{actionError}</div> : null}
      {message ? <div className="admin-apps-alert">{message}</div> : null}
      {loading ? <div className="admin-apps-alert">正在加载访问白名单…</div> : null}
      {!canManage ? <div className="admin-apps-alert">当前为只读模式，不能创建或修改访问白名单。</div> : null}

      <AccessWhitelistSummary
        clients={clients}
        capabilityOptions={capabilityOptions}
        permissions={permissions}
      />

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
            <h2>访问白名单筛选</h2>
            <p>按来源系统、目标系统、ERP 本地启停状态或关键字筛选白名单记录。</p>
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
        actionResults={actionResults}
        runningAction={runningAction}
        onApply={(permissionId) => runPermissionAction(permissionId, "apply")}
        onApplyAndVerify={(permissionId) => runPermissionAction(permissionId, "apply-verify")}
        onPatchDraft={patchDraft}
        onSave={handleSave}
        onRefresh={() => {
          void reload();
        }}
        onVerify={(permissionId) => runPermissionAction(permissionId, "verify")}
      />
    </div>
  );
}

function WriteStatusSummary({
  items,
  recentRuns,
  latestRuns,
}: {
  items: SystemServiceAuthWriteStatusItemDTO[];
  recentRuns: SystemServiceAuthWriteRunDTO[];
  latestRuns: LatestRunsByOperation;
}) {
  const activePermissions = items.filter((item) => item.permission_active).length;
  const applySuccessCount = items.filter(
    (item) => latestRuns.applyByPermissionId.get(item.permission_id)?.status === "success",
  ).length;
  const verifySuccessCount = items.filter(
    (item) => latestRuns.verifyByPermissionId.get(item.permission_id)?.status === "success",
  ).length;
  const applyFailureCount = items.filter(
    (item) => latestRuns.applyByPermissionId.get(item.permission_id)?.status === "failure",
  ).length;
  const verifyFailureCount = items.filter(
    (item) => latestRuns.verifyByPermissionId.get(item.permission_id)?.status === "failure",
  ).length;
  const noApplyCount = items.filter(
    (item) => item.permission_active && !latestRuns.applyByPermissionId.has(item.permission_id),
  ).length;

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>白名单总数</span>
          <strong>{items.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>本地启用</span>
          <strong>{activePermissions}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>写入成功</span>
          <strong>{applySuccessCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>校验成功</span>
          <strong>{verifySuccessCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>写入失败</span>
          <strong>{applyFailureCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>校验失败</span>
          <strong>{verifyFailureCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>未写入</span>
          <strong>{noApplyCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>最近记录</span>
          <strong>{recentRuns.length}</strong>
        </article>
      </div>
    </section>
  );
}

function RunMiniBlock({
  emptyTextValue,
  run,
}: {
  emptyTextValue: string;
  run: SystemServiceAuthWriteRunDTO | null;
}) {
  if (!run) {
    return <WarningPill text={emptyTextValue} />;
  }

  return (
    <div className="admin-apps-stack">
      <WriteStatusPill run={run} />
      <div className="admin-apps-muted">
        {operationText(run.operation)} · {run.status}
      </div>
      <div className="admin-apps-muted">HTTP：{emptyText(run.http_status)}</div>
      <div className="admin-apps-muted">完成：{formatDateTime(run.finished_at)}</div>
    </div>
  );
}

function RunResponseLine({
  label,
  run,
}: {
  label: string;
  run: SystemServiceAuthWriteRunDTO | null;
}) {
  if (!run) {
    return <div className="admin-apps-muted">{label}：暂无</div>;
  }

  const excerpt = compactExcerpt(run.error_message ?? run.raw_excerpt);

  return (
    <div className="admin-apps-stack">
      <div>
        {label}：HTTP {emptyText(run.http_status)}
      </div>
      <div className="admin-apps-muted">目标：{emptyText(run.target_base_url)}</div>
      {excerpt ? <div className="admin-apps-muted">摘要：{excerpt}</div> : null}
    </div>
  );
}

function WriteStatusTable({
  items,
  latestRuns,
  loading,
  onRefresh,
}: {
  items: SystemServiceAuthWriteStatusItemDTO[];
  latestRuns: LatestRunsByOperation;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (items.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>写入与校验记录</h2>
            <p>暂无 ERP 本地白名单记录。请先在“访问白名单”页面创建白名单。</p>
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
          <h2>写入与校验记录</h2>
          <p>只读展示 ERP 本地白名单在目标系统的最近写入和读回校验结果。</p>
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
              <th>来源系统身份 / 授权</th>
              <th>目标系统</th>
              <th>ERP 本地状态</th>
              <th>最近写入</th>
              <th>最近校验</th>
              <th>目标响应</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const applyRun = latestRuns.applyByPermissionId.get(item.permission_id) ?? null;
              const verifyRun = latestRuns.verifyByPermissionId.get(item.permission_id) ?? null;

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
                    <RunMiniBlock emptyTextValue="未写入" run={applyRun} />
                  </td>
                  <td>
                    <RunMiniBlock emptyTextValue="未校验" run={verifyRun} />
                  </td>
                  <td>
                    <RunResponseLine label="写入" run={applyRun} />
                    <RunResponseLine label="校验" run={verifyRun} />
                  </td>
                  <td>
                    <div>写入：{formatDateTime(applyRun?.finished_at)}</div>
                    <div className="admin-apps-muted">
                      校验：{formatDateTime(verifyRun?.finished_at)}
                    </div>
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
            <h2>最近写入与校验记录</h2>
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
          <h2>最近写入与校验记录</h2>
          <p>按执行时间倒序展示最近写入与校验记录。</p>
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

  const latestRunsByOperation = useMemo(
    () => buildLatestRunsByOperation(recentRuns),
    [recentRuns],
  );

  const sourceOptions = useMemo(() => buildSourceOptionsFromItems(items), [items]);
  const targetOptions = useMemo(() => buildTargetOptionsFromItems(items), [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const latestApplyRun = latestRunsByOperation.applyByPermissionId.get(item.permission_id) ?? null;
        const latestVerifyRun = latestRunsByOperation.verifyByPermissionId.get(item.permission_id) ?? null;

        if (sourceAppCode && item.source_app_code !== sourceAppCode) return false;
        if (targetAppCode && item.target_app_code !== targetAppCode) return false;
        if (!matchesWriteStatusFilter(statusFilter, latestApplyRun, latestVerifyRun)) return false;
        return matchesWriteStatusKeyword(item, keyword);
      }),
    [items, keyword, latestRunsByOperation, sourceAppCode, statusFilter, targetAppCode],
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
      {loading ? <div className="admin-apps-alert">正在加载写入与校验记录…</div> : null}

      <WriteStatusSummary items={items} latestRuns={latestRunsByOperation} recentRuns={recentRuns} />

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>写入与校验记录筛选</h2>
            <p>按来源系统、目标系统、写入与校验记录或关键字筛选 ERP 本地白名单写入与校验记录。</p>
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
              <option value="all">全部写入与校验记录</option>
              <option value="apply-success">写入成功</option>
              <option value="verify-success">校验成功</option>
              <option value="apply-failure">写入失败</option>
              <option value="verify-failure">校验失败</option>
              <option value="no-apply">未写入</option>
              <option value="no-verify">未校验</option>
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
        latestRuns={latestRunsByOperation}
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
