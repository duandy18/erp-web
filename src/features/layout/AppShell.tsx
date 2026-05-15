import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { label: "总控首页", path: "/" },
  { label: "应用中心", path: "/apps" },
  { label: "总控驾驶舱", path: "/cockpit" },
  { label: "登录门面", path: "/login" },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">ERP</div>
          <div>
            <div className="brand-title">安快泰 ERP</div>
            <div className="brand-subtitle">Control Plane</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              end={item.path === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">ERP Platform</div>
            <h1>总控平台</h1>
          </div>
          <div className="env-badge">local · 5170</div>
        </header>

        <section className="content">{children}</section>
      </main>
    </div>
  );
}
