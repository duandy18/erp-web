type ServiceAuthPageKey = "capabilities" | "permissions" | "write-status";

type ServiceAuthPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
};

const SERVICE_AUTH_PAGE_COPY: Record<ServiceAuthPageKey, ServiceAuthPageCopy> = {
  capabilities: {
    eyebrow: "Service Capability Catalog",
    title: "能力目录",
    description: "展示目标系统声明的 service capabilities 和 route mappings。",
    cardTitle: "能力目录",
    cardDescription:
      "后续从各目标系统读取 service capabilities 和 route mappings，ERP 只展示目标系统声明过的能力。",
  },
  permissions: {
    eyebrow: "Service Permissions",
    title: "调用授权",
    description: "按来源系统、目标系统、service client 和 capability 配置系统间调用许可。",
    cardTitle: "调用授权",
    cardDescription:
      "后续按 source app、target app、service client、capability 配置系统间调用许可。",
  },
  "write-status": {
    eyebrow: "Service Auth Write Status",
    title: "写入状态",
    description: "查看 ERP 写入目标系统 service auth 表的结果、失败原因和最近同步时间。",
    cardTitle: "写入状态",
    cardDescription:
      "后续展示 ERP 写入目标系统 service auth 表的结果、失败原因、最近同步时间和可回滚记录。",
  },
};

function SystemServiceAuthPageShell({ pageKey }: { pageKey: ServiceAuthPageKey }) {
  const copy = SERVICE_AUTH_PAGE_COPY[pageKey];

  return (
    <div className="page-stack">
      <section className="card">
        <h3>{copy.cardTitle}</h3>
        <p>{copy.cardDescription}</p>
      </section>
    </div>
  );
}

export function SystemServiceAuthCapabilitiesPage() {
  return <SystemServiceAuthPageShell pageKey="capabilities" />;
}

export function SystemServiceAuthPermissionsPage() {
  return <SystemServiceAuthPageShell pageKey="permissions" />;
}

export function SystemServiceAuthWriteStatusPage() {
  return <SystemServiceAuthPageShell pageKey="write-status" />;
}
