import { useMemo, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { useSessionRuntime } from "../../features/iam/runtime/useSessionRuntime";
import {
  buildActivePageCodeSet,
  buildPageIndex,
  buildPrimaryPathByPageCode,
  buildSidebarSections,
  resolvePageByPath,
  resolveRootPageCode,
  type SidebarNode,
} from "../navigation/sidebarNavigation";

type OpenState = Record<string, boolean>;

function linkClassName({
  active,
  depth,
  group,
}: {
  active: boolean;
  depth: number;
  group: boolean;
}): string {
  return [
    "sidebar-nav-link",
    `sidebar-nav-depth-${Math.min(depth, 5)}`,
    group ? "group" : "",
    active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderNode({
  node,
  depth,
  activeCodeSet,
}: {
  node: SidebarNode;
  depth: number;
  activeCodeSet: Set<string>;
}): ReactNode {
  const active = activeCodeSet.has(node.code);
  const hasChildren = node.children.length > 0;

  if (!hasChildren && !node.path) {
    return null;
  }

  if (!hasChildren) {
    return (
      <NavLink
        key={node.code}
        to={node.path ?? "/"}
        className={({ isActive }) =>
          linkClassName({
            active: active || isActive,
            depth,
            group: false,
          })
        }
      >
        {node.name}
      </NavLink>
    );
  }

  return (
    <div key={node.code} className="sidebar-nav-node">
      {node.path ? (
        <NavLink
          to={node.path}
          className={({ isActive }) =>
            linkClassName({
              active: active || isActive,
              depth,
              group: true,
            })
          }
        >
          {node.name}
        </NavLink>
      ) : (
        <div
          className={linkClassName({
            active,
            depth,
            group: true,
          })}
        >
          {node.name}
        </div>
      )}

      <div className="sidebar-nav-children">
        {node.children.map((child) =>
          renderNode({
            node: child,
            depth: depth + 1,
            activeCodeSet,
          }),
        )}
      </div>
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const { navigation, user, error } = useSessionRuntime();
  const [openSections, setOpenSections] = useState<OpenState>({});

  const pages = useMemo(() => navigation?.pages ?? [], [navigation?.pages]);
  const routePrefixes = useMemo(
    () => navigation?.route_prefixes ?? [],
    [navigation?.route_prefixes],
  );
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);

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

  const activeCodeSet = useMemo(
    () =>
      buildActivePageCodeSet({
        activePageCode: resolvedPage?.pageCode ?? null,
        pageIndex,
      }),
    [pageIndex, resolvedPage],
  );

  const activeRootPageCode = useMemo(
    () =>
      resolveRootPageCode({
        activePageCode: resolvedPage?.pageCode ?? null,
        pageIndex,
      }),
    [pageIndex, resolvedPage],
  );

  const sidebarSections = useMemo(
    () =>
      buildSidebarSections({
        pages,
        primaryPathByPageCode,
        permissions,
      }),
    [pages, permissions, primaryPathByPageCode],
  );

  const toggleSection = (code: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [code]: !(prev[code] ?? activeRootPageCode === code),
    }));
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">ERP</div>
        <div>
          <div className="brand-title">安快泰 ERP</div>
          <div className="brand-subtitle">Control Plane</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {error && sidebarSections.length === 0 ? (
          <div className="sidebar-nav-alert">导航加载失败：{error}</div>
        ) : null}

        {sidebarSections.map((section) => {
          if (section.nodes.length === 0 && section.path) {
            return (
              <NavLink
                key={section.code}
                to={section.path}
                className={({ isActive }) =>
                  [
                    "sidebar-nav-section-button",
                    activeRootPageCode === section.code || isActive ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                <span>{section.name}</span>
              </NavLink>
            );
          }

          const open = openSections[section.code] ?? activeRootPageCode === section.code;

          return (
            <div key={section.code} className="sidebar-nav-section">
              <button
                type="button"
                className={[
                  "sidebar-nav-section-button",
                  activeRootPageCode === section.code ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => toggleSection(section.code)}
              >
                <span>{section.name}</span>
                <span aria-hidden="true">{open ? "▾" : "▸"}</span>
              </button>

              {open ? (
                <div className="sidebar-nav-section-items">
                  {section.nodes.map((node) =>
                    renderNode({
                      node,
                      depth: 1,
                      activeCodeSet,
                    }),
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
