import { useMemo, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useSessionRuntime } from "../../features/iam/runtime/useSessionRuntime";
import { APP_RUNTIME_ENTRY_LABEL } from "../config";
import {
  buildBreadcrumbItems,
  buildPageIndex,
  buildPrimaryPathByPageCode,
  resolvePageByPath,
  type NavigationBreadcrumbItem,
} from "../navigation/sidebarNavigation";
import { Sidebar } from "./Sidebar";
import "./sidebarNavigation.css";

type AppShellProps = {
  children: ReactNode;
};

type AppShellBreadcrumbProps = {
  items: NavigationBreadcrumbItem[];
};

function AppShellBreadcrumb({ items }: AppShellBreadcrumbProps) {
  if (items.length === 0) {
    return <div className="eyebrow">ERP Platform</div>;
  }

  return (
    <nav className="topbar-breadcrumb" aria-label="页面路径">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const content = item.path && !last
          ? (
              <Link className="topbar-breadcrumb-link" to={item.path}>
                {item.name}
              </Link>
            )
          : (
              <span className={last ? "topbar-breadcrumb-current" : "topbar-breadcrumb-label"}>
                {item.name}
              </span>
            );

        return (
          <span key={item.code} className="topbar-breadcrumb-item">
            {index > 0 ? <span className="topbar-breadcrumb-separator">/</span> : null}
            {content}
          </span>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { navigation, user, logout } = useSessionRuntime();

  const pages = useMemo(() => navigation?.pages ?? [], [navigation?.pages]);
  const routePrefixes = useMemo(
    () => navigation?.route_prefixes ?? [],
    [navigation?.route_prefixes],
  );

  const pageIndex = useMemo(() => buildPageIndex(pages), [pages]);

  const primaryPathByPageCode = useMemo(
    () => buildPrimaryPathByPageCode(routePrefixes),
    [routePrefixes],
  );

  const resolvedPage = useMemo(
    () =>
      resolvePageByPath({
        pathname: location.pathname,
        routePrefixes,
        pageIndex,
      }),
    [location.pathname, pageIndex, routePrefixes],
  );

  const breadcrumbItems = useMemo(
    () =>
      buildBreadcrumbItems({
        activePageCode: resolvedPage?.pageCode ?? null,
        pageIndex,
        primaryPathByPageCode,
      }),
    [pageIndex, primaryPathByPageCode, resolvedPage],
  );

  const currentPageTitle = breadcrumbItems[breadcrumbItems.length - 1]?.name ?? "总控平台";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div className="topbar-heading">
            <AppShellBreadcrumb items={breadcrumbItems} />
            <h1>{currentPageTitle}</h1>
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
