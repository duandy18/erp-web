import { Navigate, Route, Routes } from "react-router-dom";

import { AppRegistryPage } from "../features/app-registry/pages/AppRegistryPage";
import { SystemAppProfilePage } from "../features/app-registry/pages/SystemAppProfilePage";
import { SystemAppsPage } from "../features/app-registry/pages/SystemAppsPage";
import { CockpitPage } from "../features/cockpit/pages/CockpitPage";
import { LoginPage } from "../features/iam/pages/LoginPage";
import { SystemUsersPage } from "../features/iam/pages/SystemUsersPage";
import { RequireAuth } from "../features/iam/runtime/RequireAuth";
import { SessionRuntimeProvider } from "../features/iam/runtime/SessionRuntimeProvider";
import { PortalHomePage } from "../features/portal/pages/PortalHomePage";
import { AppShell } from "../shared/layout/AppShell";

function AuthenticatedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/apps" element={<AppRegistryPage />} />
        <Route path="/cockpit" element={<CockpitPage />} />
        <Route path="/system/users" element={<SystemUsersPage />} />
        <Route path="/system/apps" element={<SystemAppsPage />} />
        <Route path="/system/apps/:appCode" element={<SystemAppProfilePage />} />
        <Route path="/system/apps/:appCode/:section" element={<SystemAppProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <SessionRuntimeProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </SessionRuntimeProvider>
  );
}
