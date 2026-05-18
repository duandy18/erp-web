import { NavLink } from "react-router-dom";

type SystemAppsTab = {
  key: "independent-systems" | "frontend-pages";
  label: string;
  path: string;
  end: boolean;
};

const SYSTEM_APPS_TABS: SystemAppsTab[] = [
  {
    key: "independent-systems",
    label: "独立系统列表",
    path: "/system/apps",
    end: true,
  },
  {
    key: "frontend-pages",
    label: "独立系统前端页面目录",
    path: "/system/apps/frontend-pages",
    end: false,
  },
];

export function SystemAppsTabs() {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-toolbar">
        {SYSTEM_APPS_TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.path}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? "admin-apps-button primary" : "admin-apps-button secondary"
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </section>
  );
}
