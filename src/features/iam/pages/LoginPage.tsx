import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useSessionRuntime } from "../runtime/useSessionRuntime";

const getEnvironmentLabel = (): string => {
  const raw = String(import.meta.env.MODE || "dev").toLowerCase();

  if (raw.includes("prod")) {
    return "生产环境";
  }

  if (raw.includes("pilot") || raw.includes("pre") || raw.includes("trial")) {
    return "中试环境";
  }

  if (raw.includes("test")) {
    return "测试环境";
  }

  return "开发环境";
};

export function LoginPage() {
  const navigate = useNavigate();
  const { error, login, status } = useSessionRuntime();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const envLabel = getEnvironmentLabel();
  const isSubmitting = status === "initializing";

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [navigate, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!username.trim() || !password.trim()) {
      setSubmitError("请输入用户名和密码");
      return;
    }

    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (currentError) {
      const message =
        currentError instanceof Error ? currentError.message : "登录失败，请检查用户名或密码。";
      setSubmitError(message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-brand-panel">
          <div className="login-badge">
            <span className="login-badge-dot" />
            统一入口 · IAM · App Registry
          </div>

          <div className="login-brand-copy">
            <h1>安快泰 ERP 总控平台</h1>
            <p>
              Control Plane · 应用注册中心 · 系统间授权 · 审计与异常中心，
              为独立业务系统提供统一入口、统一身份和总控驾驶舱。
            </p>
          </div>

          <div className="login-visual">
            <div className="login-visual-grid" />
            <div className="login-visual-content">
              <div className="login-flow-row">
                <div className="login-flow-box">Portal</div>
                <div className="login-flow-box">IAM</div>
              </div>

              <div className="login-trace-line">
                <span />
                <strong>control_plane</strong>
                <span />
              </div>

              <div className="login-module-grid">
                <div>
                  <span>Registry</span>
                  <strong>应用注册</strong>
                </div>
                <div>
                  <span>Gateway</span>
                  <strong>统一入口</strong>
                </div>
                <div>
                  <span>Audit</span>
                  <strong>审计追踪</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="login-copyright">本系统版权归北京安快泰科技有限公司所有</div>
        </section>

        <section className="login-card-panel">
          <div className="login-env-row">
            <span className="login-env-badge">{envLabel}</span>
          </div>

          <div className="login-form-card">
            <div className="login-form-heading">
              <h2>登录 安快泰</h2>
              <p>请输入用户名与密码登录系统，所有操作将记录至审计日志。</p>
            </div>

            {(submitError || error) && <div className="login-error">{submitError ?? error}</div>}

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>用户名</span>
                <input
                  name="username"
                  value={username}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="login-field">
                <span>密码</span>
                <div className="login-password-input">
                  <input
                    name="password"
                    value={password}
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    title={showPassword ? "隐藏密码" : "显示密码"}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </label>

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "登录中…" : "登录"}
              </button>
            </form>

            <p className="login-hint">默认本地账号：admin / admin123</p>
          </div>
        </section>
      </div>
    </div>
  );
}
