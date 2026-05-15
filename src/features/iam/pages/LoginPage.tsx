import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSessionRuntime } from "../runtime/useSessionRuntime";

export function LoginPage() {
  const navigate = useNavigate();
  const { error, login, status } = useSessionRuntime();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSubmitting = status === "initializing";

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [navigate, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      await login(username, password);
      navigate("/", { replace: true });
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "登录失败";
      setSubmitError(message);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel intro">
        <div className="eyebrow">ERP Control Plane</div>
        <h2>统一入口登录门面</h2>
        <p>
          当前阶段接入 ERP IAM 登录合同。后续再扩展 SSO、系统间授权、
          审计中心和跨系统流程追踪。
        </p>
        <div className="feature-list">
          <span>Portal</span>
          <span>IAM</span>
          <span>Audit</span>
          <span>Alert</span>
        </div>
      </section>

      <form className="login-panel form" onSubmit={handleSubmit}>
        <div>
          <div className="eyebrow">Local Preview</div>
          <h3>登录 ERP 总控平台</h3>
        </div>

        <label>
          用户名
          <input
            name="username"
            value={username}
            placeholder="admin"
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          密码
          <input
            name="password"
            value={password}
            type={showPassword ? "text" : "password"}
            placeholder="admin123"
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          显示密码
        </label>

        {(submitError || error) && <p className="muted">{submitError ?? error}</p>}

        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "登录中..." : "登录 ERP 总控平台"}
        </button>

        <p className="muted">默认本地账号：admin / admin123。</p>
      </form>
    </div>
  );
}
