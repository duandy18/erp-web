import type { RegisteredApp } from "../data/registeredApps";

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
          <dd>{app.webPath}</dd>
        </div>
        <div>
          <dt>Gateway API</dt>
          <dd>{app.apiPath}</dd>
        </div>
        <div>
          <dt>Local Web</dt>
          <dd>{app.localWebUrl}</dd>
        </div>
        <div>
          <dt>Local API</dt>
          <dd>{app.localApiUrl}</dd>
        </div>
      </dl>

      <a className="button secondary" href={app.localWebUrl}>
        打开本地系统
      </a>
    </article>
  );
}
