import { useMemo, useState } from "react";

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

function StatusPill({ status }: { status: string }) {
  return (
    <span className={status === "ok" ? "admin-apps-status success" : "admin-apps-status muted"}>
      {statusText(status)}
    </span>
  );
}

function BoolText({ value }: { value: boolean | null }) {
  if (value === null) return <span className="admin-apps-muted">-</span>;

  return (
    <span className={value ? "admin-apps-status success" : "admin-apps-status muted"}>
      {value ? "是" : "否"}
    </span>
  );
}

function writeRunText(run: SystemServiceAuthContractWriteRunDTO | null): string {
  if (!run) return "暂无";
  return `${run.operation} / ${run.status} / HTTP ${emptyText(run.http_status)}`;
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
    contract.dependency_code ?? "",
    contract.dependency_name ?? "",
    contract.dependency_description ?? "",
    contract.target_capability_code ?? "",
    contract.target_capability_name ?? "",
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

function DetailList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  const compactItems = items.filter((item) => item.trim() !== "");

  if (compactItems.length === 0) {
    return <div className="admin-apps-muted">{title}：暂无</div>;
  }

  return (
    <div className="admin-apps-stack">
      <div className="admin-apps-muted">
        {title}：共 {compactItems.length} 项
      </div>
      {compactItems.slice(0, 4).map((item) => (
        <div key={item} className="admin-apps-code">
          {item}
        </div>
      ))}
      {compactItems.length > 4 ? (
        <div className="admin-apps-muted">还有 {compactItems.length - 4} 项未展开</div>
      ) : null}
    </div>
  );
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
          <p>只读聚合展示应用注册、依赖声明、目标能力、访问白名单以及写入/校验状态。</p>
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
              <th>合同</th>
              <th>来源 / 目标</th>
              <th>依赖 / 能力</th>
              <th>访问白名单</th>
              <th>写入 / 校验</th>
              <th>接口</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.contract_code}>
                <td>
                  <div className="admin-apps-code">{contract.contract_code}</div>
                  <div>{contract.contract_name}</div>
                  <div className="admin-apps-muted">
                    {scopeText(contract.contract_scope)} · {contractTypeText(contract.contract_type)}
                  </div>
                </td>
                <td>
                  <div>
                    <span className="admin-apps-code">{contract.source_app_code}</span>
                    <span> → </span>
                    <span className="admin-apps-code">{contract.target_app_code}</span>
                  </div>
                  <div className="admin-apps-muted">{contract.source_app_name}</div>
                  <div className="admin-apps-muted">{contract.target_app_name}</div>
                  {contract.web_path || contract.api_path ? (
                    <div className="admin-apps-muted">
                      {emptyText(contract.web_path)} / {emptyText(contract.api_path)}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="admin-apps-code">
                    {emptyText(contract.dependency_code ?? contract.target_capability_code)}
                  </div>
                  <div>{emptyText(contract.dependency_name ?? contract.target_capability_name)}</div>
                  <div className="admin-apps-muted">
                    能力：{emptyText(contract.target_capability_code)}
                  </div>
                  <div className="admin-apps-muted">
                    权限：{emptyText(contract.required_permission_code)}
                  </div>
                  <div className="admin-apps-muted">
                    目标能力存在：<BoolText value={contract.target_capability_exists} />
                  </div>
                </td>
                <td>
                  <div>Client：{emptyText(contract.client_code)}</div>
                  <div>
                    已配置：<BoolText value={contract.permission_configured} />
                  </div>
                  <div>
                    启用：<BoolText value={contract.permission_active} />
                  </div>
                  <div className="admin-apps-muted">
                    permission #{emptyText(contract.permission_id)}
                  </div>
                </td>
                <td>
                  <div>写入：{writeRunText(contract.latest_apply_run)}</div>
                  <div>校验：{writeRunText(contract.latest_verify_run)}</div>
                  <div className="admin-apps-muted">
                    同步：
                    {formatDateTime(contract.dependency_last_synced_at ?? contract.manifest_synced_at)}
                  </div>
                </td>
                <td>
                  <DetailList
                    title="依赖端点"
                    items={contract.dependency_endpoints.map(
                      (endpoint) => `${endpoint.http_method} ${endpoint.path}`,
                    )}
                  />
                  <DetailList
                    title="能力路由"
                    items={contract.capability_routes.map((route) => `${route.http_method} ${route.path}`)}
                  />
                </td>
                <td>
                  <StatusPill status={contract.contract_status} />
                  <div className="admin-apps-muted">{contract.issue_summary ?? "无问题"}</div>
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
              placeholder="搜索合同 / 能力 / 端点 / 问题"
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
