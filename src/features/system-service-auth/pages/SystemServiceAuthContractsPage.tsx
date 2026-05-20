import { type CSSProperties, useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import type {
  SystemServiceAuthContractDTO,
  SystemServiceAuthContractEndpointDTO,
  SystemServiceAuthContractRouteDTO,
  SystemServiceAuthContractWriteRunDTO,
} from "../contracts/systemServiceAuthContracts";
import { useSystemServiceAuthContracts } from "../hooks/useSystemServiceAuthContracts";

type Option = {
  code: string;
  name: string;
};

const fixedTableStyle: CSSProperties = {
  tableLayout: "fixed",
  width: "100%",
  minWidth: 0,
};

const topCellStyle: CSSProperties = {
  verticalAlign: "top",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const compactCodeStyle: CSSProperties = {
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  lineHeight: 1.5,
};

const compactStackStyle: CSSProperties = {
  gap: "0.35rem",
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "暂无";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function emptyText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function scopeText(scope: string): string {
  const map: Record<string, string> = {
    control_plane: "控制面",
    data_plane: "数据面",
  };

  return map[scope] ?? scope;
}

function contractTypeText(type: string): string {
  const map: Record<string, string> = {
    app_registration: "应用注册",
    callback: "Callback",
    projection: "Projection",
    read_v1: "Read API",
    unknown: "未知",
    write_v1: "Write API",
  };

  return map[type] ?? type;
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    apply_failed: "写入失败",
    inactive_app: "应用停用",
    inactive_capability: "能力停用",
    inactive_permission: "白名单停用",
    missing_capability: "缺目标能力",
    missing_manifest: "缺应用自描述",
    missing_permission: "缺访问白名单",
    not_applied: "未写入",
    not_verified: "未校验",
    ok: "正常",
    verify_failed: "校验失败",
  };

  return map[status] ?? status;
}

function operationText(operation: string): string {
  const map: Record<string, string> = {
    disable: "停用",
    upsert: "写入",
    verify: "校验",
  };

  return map[operation] ?? operation;
}

function runStatusText(status: string): string {
  const map: Record<string, string> = {
    failure: "失败",
    running: "执行中",
    success: "成功",
  };

  return map[status] ?? status;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={status === "ok" ? "admin-apps-status success" : "admin-apps-status muted"}>
      {statusText(status)}
    </span>
  );
}

function BoolLabel({
  value,
  trueText,
  falseText,
}: {
  value: boolean | null | undefined;
  trueText: string;
  falseText: string;
}) {
  if (value === null || value === undefined) {
    return <span className="admin-apps-muted">-</span>;
  }

  return (
    <span className={value ? "admin-apps-status success" : "admin-apps-status muted"}>
      {value ? trueText : falseText}
    </span>
  );
}

function isAppRegistrationContract(contract: SystemServiceAuthContractDTO): boolean {
  return contract.contract_type === "app_registration";
}

function writeRunSummary(run: SystemServiceAuthContractWriteRunDTO | null): string {
  if (!run) return "暂无";

  return `${operationText(run.operation)}${runStatusText(run.status)} · HTTP ${emptyText(
    run.http_status,
  )}`;
}

function endpointText(endpoint: SystemServiceAuthContractEndpointDTO): string {
  return `${endpoint.http_method} ${endpoint.path} ${endpoint.purpose ?? ""}`;
}

function routeText(route: SystemServiceAuthContractRouteDTO): string {
  return `${route.http_method} ${route.path} ${route.route_name}`;
}

function buildSourceOptions(contracts: SystemServiceAuthContractDTO[]): Option[] {
  const map = new Map<string, string>();

  for (const contract of contracts) {
    map.set(contract.source_app_code, contract.source_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function buildTargetOptions(contracts: SystemServiceAuthContractDTO[]): Option[] {
  const map = new Map<string, string>();

  for (const contract of contracts) {
    map.set(contract.target_app_code, contract.target_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function buildValueOptions(
  contracts: SystemServiceAuthContractDTO[],
  pick: (contract: SystemServiceAuthContractDTO) => string,
): string[] {
  return Array.from(new Set(contracts.map(pick).filter((value) => value.trim() !== ""))).sort(
    (left, right) => left.localeCompare(right),
  );
}

function matchesKeyword(contract: SystemServiceAuthContractDTO, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;

  const haystack = [
    contract.contract_code,
    contract.contract_name,
    contract.contract_scope,
    contract.contract_type,
    contract.contract_status,
    contract.issue_summary ?? "",
    contract.source_app_code,
    contract.source_app_name,
    contract.target_app_code,
    contract.target_app_name,
    contract.web_path ?? "",
    contract.api_path ?? "",
    contract.env_code ?? "",
    contract.deployment_mode ?? "",
    contract.control_base_url ?? "",
    contract.internal_api_base_url ?? "",
    contract.public_web_url ?? "",
    contract.public_api_base_url ?? "",
    contract.service_client_code ?? "",
    contract.service_client_header ?? "",
    contract.dependency_code ?? "",
    contract.dependency_name ?? "",
    contract.dependency_description ?? "",
    contract.target_capability_code ?? "",
    contract.target_capability_name ?? "",
    contract.target_resource_code ?? "",
    contract.required_permission_code ?? "",
    contract.client_code ?? "",
    contract.required_config_keys.join(" "),
    contract.source_modules.join(" "),
    contract.dependency_endpoints.map(endpointText).join(" "),
    contract.capability_routes.map(routeText).join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedKeyword);
}

function ContractsSummary({ contracts }: { contracts: SystemServiceAuthContractDTO[] }) {
  const okCount = contracts.filter((contract) => contract.contract_status === "ok").length;
  const controlPlaneCount = contracts.filter(
    (contract) => contract.contract_scope === "control_plane",
  ).length;
  const dataPlaneCount = contracts.filter(
    (contract) => contract.contract_scope === "data_plane",
  ).length;
  const issueCount = contracts.length - okCount;
  const missingPermissionCount = contracts.filter(
    (contract) => contract.contract_status === "missing_permission",
  ).length;
  const missingCapabilityCount = contracts.filter(
    (contract) => contract.contract_status === "missing_capability",
  ).length;

  return (
    <section className="admin-apps-card">
      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>合同总数</span>
          <strong>{contracts.length}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>正常</span>
          <strong>{okCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>待处理</span>
          <strong>{issueCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>控制面</span>
          <strong>{controlPlaneCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>数据面</span>
          <strong>{dataPlaneCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>缺白名单</span>
          <strong>{missingPermissionCount}</strong>
        </article>
        <article className="admin-apps-profile-link">
          <span>缺目标能力</span>
          <strong>{missingCapabilityCount}</strong>
        </article>
      </div>
    </section>
  );
}

function ContractIdentityCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <strong>{contract.contract_name}</strong>
      <div className="admin-apps-code" style={compactCodeStyle}>
        {contract.contract_code}
      </div>
      <div className="admin-apps-muted">
        {scopeText(contract.contract_scope)} · {contractTypeText(contract.contract_type)}
      </div>
    </div>
  );
}

function SourceDependencyCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (isAppRegistrationContract(contract)) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        <strong>{contract.source_app_code}</strong>
        <div>{contract.source_app_name}</div>
        <div className="admin-apps-muted">
          部署：{emptyText(contract.env_code)} / {emptyText(contract.deployment_mode)}
        </div>
        <div className="admin-apps-muted">入口：{emptyText(contract.web_path)}</div>
        <div className="admin-apps-muted">API 路径：{emptyText(contract.api_path)}</div>
        <div className="admin-apps-muted">声明方式：Manifest V2</div>
      </div>
    );
  }

  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <strong>{contract.source_app_code}</strong>
      <div>{contract.source_app_name}</div>
      <div>
        <span className="admin-apps-muted">Client：</span>
        {emptyText(contract.client_code)}
      </div>
      <div className="admin-apps-code" style={compactCodeStyle}>
        {emptyText(contract.dependency_code)}
      </div>
      <div className="admin-apps-muted">
        依赖状态：
        <BoolLabel value={contract.dependency_active} trueText="启用" falseText="停用" />
      </div>
    </div>
  );
}

function TargetCapabilityCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (isAppRegistrationContract(contract)) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        <strong>Manifest V2</strong>
        <div>
          <span className="admin-apps-muted">控制面：</span>
          {emptyText(contract.control_base_url)}
        </div>
        <div>
          <span className="admin-apps-muted">内部 API：</span>
          {emptyText(contract.internal_api_base_url)}
        </div>
        <div>
          <span className="admin-apps-muted">公共 Web：</span>
          {emptyText(contract.public_web_url)}
        </div>
        <div>
          <span className="admin-apps-muted">系统身份：</span>
          {emptyText(contract.service_client_code)}
        </div>
        <div>
          <span className="admin-apps-muted">Header：</span>
          {emptyText(contract.service_client_header)}
        </div>
      </div>
    );
  }

  const hasCapability = Boolean(contract.target_capability_code);

  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <strong>{contract.target_app_code}</strong>
      <div>{contract.target_app_name}</div>
      {hasCapability ? (
        <>
          <div className="admin-apps-code" style={compactCodeStyle}>
            {contract.target_capability_code}
          </div>
          <div>{emptyText(contract.target_capability_name)}</div>
          <div className="admin-apps-muted">资源：{emptyText(contract.target_resource_code)}</div>
          <div className="admin-apps-muted">
            能力：
            <BoolLabel value={contract.target_capability_exists} trueText="已声明" falseText="未声明" />
          </div>
          <div className="admin-apps-muted">
            状态：
            <BoolLabel
              value={contract.target_capability_active}
              trueText="提供中"
              falseText="已停用"
            />
          </div>
        </>
      ) : (
        <div className="admin-apps-muted">不依赖目标 capability</div>
      )}
    </div>
  );
}

function CapabilityRouteBlock({ route }: { route: SystemServiceAuthContractRouteDTO }) {
  return (
    <div className="admin-apps-code" style={compactCodeStyle}>
      <div>
        {route.http_method} {route.path}
      </div>
      <div>{route.route_name}</div>
      <div>系统身份校验：{route.auth_required ? "需要" : "不需要"}</div>
      <div>接口状态：{route.is_active ? "提供中" : "已停用"}</div>
    </div>
  );
}

function DependencyEndpointBlock({ endpoint }: { endpoint: SystemServiceAuthContractEndpointDTO }) {
  return (
    <div className="admin-apps-code" style={compactCodeStyle}>
      <div>
        {endpoint.http_method} {endpoint.path}
      </div>
      <div>用途：{emptyText(endpoint.purpose)}</div>
      <div>同步时间：{formatDateTime(endpoint.last_synced_at)}</div>
    </div>
  );
}

function InterfaceRoutesCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (contract.capability_routes.length > 0) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        {contract.capability_routes.map((route) => (
          <CapabilityRouteBlock
            key={`${contract.contract_code}:${route.http_method}:${route.path}:${route.route_name}`}
            route={route}
          />
        ))}
      </div>
    );
  }

  if (contract.dependency_endpoints.length > 0) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        {isAppRegistrationContract(contract) ? (
          <strong className="admin-apps-muted">自描述接口</strong>
        ) : null}
        {contract.dependency_endpoints.map((endpoint) => (
          <DependencyEndpointBlock
            key={`${contract.contract_code}:${endpoint.http_method}:${endpoint.path}:${endpoint.purpose ?? ""}`}
            endpoint={endpoint}
          />
        ))}
      </div>
    );
  }

  return <span className="admin-apps-muted">未声明接口路由</span>;
}

function PermissionCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (isAppRegistrationContract(contract)) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        <strong>不适用</strong>
        <div className="admin-apps-muted">应用注册合同不通过访问白名单授权。</div>
      </div>
    );
  }

  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <div>
        白名单：
        <BoolLabel value={contract.permission_configured} trueText="已配置" falseText="缺失" />
      </div>
      <div>
        本地：
        <BoolLabel value={contract.permission_active} trueText="启用" falseText="停用" />
      </div>
      <div>
        <span className="admin-apps-muted">Client：</span>
        {emptyText(contract.client_code)}
      </div>
      <div className="admin-apps-code" style={compactCodeStyle}>
        {emptyText(contract.required_permission_code)}
      </div>
      <div className="admin-apps-muted">permission #{emptyText(contract.permission_id)}</div>
    </div>
  );
}

function WriteVerifyCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (isAppRegistrationContract(contract)) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        <strong>不适用</strong>
        <div className="admin-apps-muted">应用注册合同通过自描述同步确认。</div>
        <div className="admin-apps-muted">
          同步时间：{formatDateTime(contract.manifest_synced_at)}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <div>写入：{writeRunSummary(contract.latest_apply_run)}</div>
      <div>校验：{writeRunSummary(contract.latest_verify_run)}</div>
      <div className="admin-apps-muted">
        写入时间：{formatDateTime(contract.latest_apply_run?.finished_at)}
      </div>
      <div className="admin-apps-muted">
        校验时间：{formatDateTime(contract.latest_verify_run?.finished_at)}
      </div>
    </div>
  );
}

function HealthCell({ contract }: { contract: SystemServiceAuthContractDTO }) {
  if (isAppRegistrationContract(contract)) {
    return (
      <div className="admin-apps-stack" style={compactStackStyle}>
        <StatusPill status={contract.contract_status} />
        <div>{contract.issue_summary ?? "应用自描述已同步"}</div>
      </div>
    );
  }

  return (
    <div className="admin-apps-stack" style={compactStackStyle}>
      <StatusPill status={contract.contract_status} />
      <div>{contract.issue_summary ?? "全部正常"}</div>
    </div>
  );
}

function ContractsTable({
  contracts,
  loading,
  onRefresh,
}: {
  contracts: SystemServiceAuthContractDTO[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (contracts.length === 0) {
    return (
      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>合同目录</h2>
            <p>暂无合同目录数据。请先同步独立系统自描述。</p>
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
          <h2>合同目录</h2>
          <p>只读全景表：每条合同一行，接口路由完整高行展开。</p>
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
        <table className="admin-apps-table" style={fixedTableStyle}>
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={topCellStyle}>合同名称</th>
              <th style={topCellStyle}>来源依赖</th>
              <th style={topCellStyle}>目标能力</th>
              <th style={topCellStyle}>接口路由</th>
              <th style={topCellStyle}>访问白名单</th>
              <th style={topCellStyle}>写入 / 校验</th>
              <th style={topCellStyle}>健康结论</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.contract_code}>
                <td style={topCellStyle}>
                  <ContractIdentityCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <SourceDependencyCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <TargetCapabilityCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <InterfaceRoutesCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <PermissionCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <WriteVerifyCell contract={contract} />
                </td>
                <td style={topCellStyle}>
                  <HealthCell contract={contract} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SystemServiceAuthContractsPage() {
  const { token, user } = useSessionRuntime();
  const [keyword, setKeyword] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceAppCode, setSourceAppCode] = useState("");
  const [targetAppCode, setTargetAppCode] = useState("");

  const canRead = Boolean(
    user?.permissions.includes("page.erp.system.read") ||
      user?.permissions.includes("page.erp.system.write"),
  );

  const { contracts, loading, error, reload } = useSystemServiceAuthContracts(token);

  const sourceOptions = useMemo(() => buildSourceOptions(contracts), [contracts]);
  const targetOptions = useMemo(() => buildTargetOptions(contracts), [contracts]);
  const scopeOptions = useMemo(
    () => buildValueOptions(contracts, (contract) => contract.contract_scope),
    [contracts],
  );
  const typeOptions = useMemo(
    () => buildValueOptions(contracts, (contract) => contract.contract_type),
    [contracts],
  );
  const statusOptions = useMemo(
    () => buildValueOptions(contracts, (contract) => contract.contract_status),
    [contracts],
  );

  const filteredContracts = useMemo(
    () =>
      contracts.filter((contract) => {
        if (scopeFilter && contract.contract_scope !== scopeFilter) return false;
        if (typeFilter && contract.contract_type !== typeFilter) return false;
        if (statusFilter && contract.contract_status !== statusFilter) return false;
        if (sourceAppCode && contract.source_app_code !== sourceAppCode) return false;
        if (targetAppCode && contract.target_app_code !== targetAppCode) return false;
        return matchesKeyword(contract, keyword);
      }),
    [contracts, keyword, scopeFilter, sourceAppCode, statusFilter, targetAppCode, typeFilter],
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
      {loading ? <div className="admin-apps-alert">正在加载合同目录…</div> : null}

      <ContractsSummary contracts={contracts} />

      <section className="admin-apps-card">
        <div className="admin-apps-table-header">
          <div>
            <h2>合同目录筛选</h2>
            <p>按范围、类型、状态、来源系统、目标系统或关键字筛选合同目录。</p>
          </div>
          <div className="admin-apps-toolbar">
            <select value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value)}>
              <option value="">全部范围</option>
              {scopeOptions.map((scope) => (
                <option key={scope} value={scope}>
                  {scopeText(scope)}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">全部类型</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {contractTypeText(type)}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusText(status)}
                </option>
              ))}
            </select>
            <select value={sourceAppCode} onChange={(event) => setSourceAppCode(event.target.value)}>
              <option value="">全部来源</option>
              {sourceOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <select value={targetAppCode} onChange={(event) => setTargetAppCode(event.target.value)}>
              <option value="">全部目标</option>
              {targetOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
            <input
              placeholder="搜索合同 / 能力 / 接口 / 问题"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
        </div>
      </section>

      <ContractsTable
        contracts={filteredContracts}
        loading={loading}
        onRefresh={() => {
          void reload();
        }}
      />
    </div>
  );
}
