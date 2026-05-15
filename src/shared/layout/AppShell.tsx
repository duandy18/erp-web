import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import type { NavigationPage } from "../../features/iam/contracts/navigation";
import { useSessionRuntime } from "../../features/iam/runtime/useSessionRuntime";
import { APP_RUNTIME_ENTRY_LABEL } from "../config";

type AppShellProps = {
  children: ReactNode;
};

const getRouteByPageCode = (
  pageCode: string,
  routePrefixes: { page_code: string; route_prefix: string }[],
): string | null => {
  const matched = routePrefixes.find((item) => item.page_code === pageCode);
  return matched?.route_prefix ?? null;
};

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const { navigation, user, logout } = useSessionRuntime();

  const routePrefixes = navigation?.route_prefixes ?? [];
  const pages = navigation?.pages ?? [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderPage = (page: NavigationPage): ReactNode => {
    if (!page.show_in_sidebar) {
      return null;
    }

    const primaryRoute = getRouteByPageCode(page.code, routePrefixes);
    const visibleChildren = page.children.filter((child) => child.show_in_sidebar);

    return (
      <div key={page.code} className="nav-list">
        {primaryRoute ? (
          <NavLink
            to={primaryRoute}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            end={primaryRoute === "/"}
          >
            {page.name}
          </NavLink>
        ) : (
          <div className="nav-link">{page.name}</div>
        )}

        {visibleChildren.map((child) => renderPage(child))}
      </div>
    );
  };

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

        <nav className="nav-list">{pages.map((page) => renderPage(page))}</nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">ERP Platform</div>
            <h1>总控平台</h1>
          </div>
          <div className="topbar-actions">
            <div className="env-badge">
              {user?.username ?? "local"} · {APP_RUNTIME_ENTRY_LABEL}
            </div>
            <button className="button secondary" type="button" onClick={handleLogout}>
              退出
            </button>
          </div>
        </header>

        <section className="content">{children}</section>
      </main>
    </div>
  );
}
