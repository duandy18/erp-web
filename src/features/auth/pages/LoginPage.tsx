import type { FormEvent } from "react";
import { useState } from "react";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="login-page">
      <section className="login-panel intro">
        <div className="eyebrow">ERP Control Plane</div>
        <h2>统一入口登录门面</h2>
        <p>
          当前阶段只建立 ERP 登录门面和路由骨架。
          后续再接 IAM、SSO、系统间授权和审计。
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
          <input name="username" placeholder="admin" autoComplete="username" />
        </label>

        <label>
          密码
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="admin123"
            autoComplete="current-password"
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

        <button className="button" type="submit">
          登录门面占位
        </button>

        <p className="muted">真实 IAM 合同后续单独设计，不在本次骨架里硬编码。</p>
      </form>
    </div>
  );
}
