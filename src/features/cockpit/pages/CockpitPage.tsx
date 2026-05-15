import { API_BASE_URL } from "../../../config";

export function CockpitPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">Cockpit</div>
        <h2>总控驾驶舱雏形</h2>
        <p>当前只展示控制面合同。经营指标、流程追踪、异常中心后续按 API 合同逐步接入。</p>
      </section>

      <section className="grid two-columns">
        <div className="card">
          <h3>ERP API</h3>
          <p>{API_BASE_URL}</p>
          <p className="muted">健康检查：/healthz /health/db</p>
        </div>

        <div className="card">
          <h3>阶段边界</h3>
          <p>不直接读业务系统数据库，不共享业务表，不把业务页面塞进 ERP Web。</p>
        </div>
      </section>
    </div>
  );
}
