import type { RegisteredApp } from "../contracts/appRegistry";

type AppCardProps = {
  app: RegisteredApp;
};

export function AppCard({ app }: AppCardProps) {
  return (
    <article className="card app-card">
      <div className="card-header">
        <div>
          <div className="eyebrow">{app.code.toUpperCase()}</div>
          <h3>{app.name}</h3>
        </div>
        <span className={`status-pill ${app.status}`}>{app.status}</span>
      </div>

      <p>{app.description}</p>

      <dl className="contract-list">
        <div>
          <dt>Gateway Web</dt>
          <dd>{app.web_path}</dd>
        </div>
        <div>
          <dt>Gateway API</dt>
          <dd>{app.api_path}</dd>
        </div>
        <div>
          <dt>Local Web</dt>
          <dd>{app.local_web_url}</dd>
        </div>
        <div>
          <dt>Local API</dt>
          <dd>{app.local_api_url}</dd>
        </div>
      </dl>

      <a className="button secondary" href={app.local_web_url}>
        打开本地系统
      </a>
    </article>
  );
}
