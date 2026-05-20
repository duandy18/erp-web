import type { RegisteredApp } from "../contracts/appRegistry";

type AppCardProps = {
  app: RegisteredApp;
};

function statusText(status: RegisteredApp["status"]): string {
  return status === "ready" ? "已就绪" : "规划中";
}

export function AppCard({ app }: AppCardProps) {
  return (
    <article className="card app-card">
      <div className="card-header">
        <div>
          <div className="eyebrow">{app.code.toUpperCase()}</div>
          <h3>{app.name}</h3>
        </div>
        <span className={`status-pill ${app.status}`}>{statusText(app.status)}</span>
      </div>

      <p>{app.description}</p>

      <dl className="contract-list">
        <div>
          <dt>Web 入口</dt>
          <dd>{app.web_path}</dd>
        </div>
        <div>
          <dt>API 前缀</dt>
          <dd>{app.api_path}</dd>
        </div>
        <div>
          <dt>启停状态</dt>
          <dd>{app.is_active ? "启用" : "停用"}</dd>
        </div>
        <div>
          <dt>配置状态</dt>
          <dd>{statusText(app.status)}</dd>
        </div>
      </dl>

      <a className="button secondary" href={app.web_path}>
        进入系统
      </a>
    </article>
  );
}
