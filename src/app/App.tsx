import { Navigate, Route, Routes } from "react-router-dom";

import { SystemAppsPage } from "../features/app-registry/pages/SystemAppsPage";
import { LoginPage } from "../features/iam/pages/LoginPage";
import { SystemUsersPage } from "../features/iam/pages/SystemUsersPage";
import { RequireAuth } from "../features/iam/runtime/RequireAuth";
import { SessionRuntimeProvider } from "../features/iam/runtime/SessionRuntimeProvider";
import { MyAppsPage } from "../features/my-apps/pages/MyAppsPage";
import { SystemMonitoringPage } from "../features/system-monitoring/pages/SystemMonitoringPage";
import { SystemServiceAuthPage } from "../features/system-service-auth/pages/SystemServiceAuthPage";
import { AppShell } from "../shared/layout/AppShell";

function AuthenticatedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MyAppsPage />} />
        <Route path="/system/users" element={<SystemUsersPage />} />

        <Route path="/system/apps" element={<SystemAppsPage />} />
        <Route path="/system/apps/components" element={<SystemAppsPage />} />
        <Route path="/system/apps/environments" element={<SystemAppsPage />} />
        <Route path="/system/apps/app-environments" element={<SystemAppsPage />} />
        <Route path="/system/apps/repositories" element={<SystemAppsPage />} />
        <Route path="/system/apps/gateway" element={<SystemAppsPage />} />

        <Route path="/system/service-auth" element={<SystemServiceAuthPage />} />
        <Route path="/system/service-auth/capabilities" element={<SystemServiceAuthPage />} />
        <Route path="/system/service-auth/permissions" element={<SystemServiceAuthPage />} />
        <Route path="/system/service-auth/write-status" element={<SystemServiceAuthPage />} />

        <Route path="/system/monitoring" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/endpoints" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/databases" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/gateway" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/dependencies" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/service-auth" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/openapi" element={<SystemMonitoringPage />} />
        <Route path="/system/monitoring/health" element={<SystemMonitoringPage />} />

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
