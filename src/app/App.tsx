import { Navigate, Route, Routes } from "react-router-dom";

import { SystemAppsFrontendPagesPage } from "../features/app-registry/pages/SystemAppsFrontendPagesPage";
import { SystemAppsListPage } from "../features/app-registry/pages/SystemAppsListPage";
import { LoginPage } from "../features/iam/pages/LoginPage";
import { AppPermissionsPage } from "../features/iam/pages/AppPermissionsPage";
import { ErpPermissionsPage } from "../features/iam/pages/ErpPermissionsPage";
import { UserAccountsPage } from "../features/iam/pages/UserAccountsPage";
import { RequireAuth } from "../features/iam/runtime/RequireAuth";
import { SessionRuntimeProvider } from "../features/iam/runtime/SessionRuntimeProvider";
import { MyAppsPage } from "../features/my-apps/pages/MyAppsPage";
import {
  SystemMonitoringDatabasesPage,
  SystemMonitoringDependenciesPage,
  SystemMonitoringEndpointsPage,
  SystemMonitoringGatewayPage,
  SystemMonitoringHealthPage,
  SystemMonitoringOpenApiPage,
  SystemMonitoringOverviewPage,
  SystemMonitoringServiceAuthPage,
} from "../features/system-monitoring/pages/SystemMonitoringPage";
import { SystemServiceAuthContractsPage } from "../features/system-service-auth/pages/SystemServiceAuthContractsPage";
import {
  SystemServiceAuthCapabilitiesPage,
  SystemServiceAuthPermissionsPage,
  SystemServiceAuthWriteStatusPage,
} from "../features/system-service-auth/pages/SystemServiceAuthPage";
import { AppShell } from "../shared/layout/AppShell";

function AuthenticatedRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MyAppsPage />} />

        <Route path="/system/users/accounts" element={<UserAccountsPage />} />
        <Route path="/system/users/erp-permissions" element={<ErpPermissionsPage />} />
        <Route path="/system/users/app-permissions" element={<AppPermissionsPage />} />

        <Route path="/system/apps" element={<SystemAppsListPage />} />
        <Route path="/system/apps/frontend-pages" element={<SystemAppsFrontendPagesPage />} />

        <Route path="/system/service-auth" element={<SystemServiceAuthCapabilitiesPage />} />
        <Route
          path="/system/service-auth/contracts"
          element={<SystemServiceAuthContractsPage />}
        />
        <Route
          path="/system/service-auth/capabilities"
          element={<SystemServiceAuthCapabilitiesPage />}
        />
        <Route path="/system/service-auth/permissions" element={<SystemServiceAuthPermissionsPage />} />
        <Route path="/system/service-auth/write-status" element={<SystemServiceAuthWriteStatusPage />} />

        <Route path="/system/monitoring" element={<SystemMonitoringOverviewPage />} />
        <Route path="/system/monitoring/endpoints" element={<SystemMonitoringEndpointsPage />} />
        <Route path="/system/monitoring/databases" element={<SystemMonitoringDatabasesPage />} />
        <Route path="/system/monitoring/gateway" element={<SystemMonitoringGatewayPage />} />
        <Route path="/system/monitoring/dependencies" element={<SystemMonitoringDependenciesPage />} />
        <Route path="/system/monitoring/service-auth" element={<SystemMonitoringServiceAuthPage />} />
        <Route path="/system/monitoring/openapi" element={<SystemMonitoringOpenApiPage />} />
        <Route path="/system/monitoring/health" element={<SystemMonitoringHealthPage />} />

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
