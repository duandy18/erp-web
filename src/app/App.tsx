import { Navigate, Route, Routes } from "react-router-dom";

import { AppRegistryPage } from "../features/app-registry/pages/AppRegistryPage";
import { CockpitPage } from "../features/cockpit/pages/CockpitPage";
import { LoginPage } from "../features/iam/pages/LoginPage";
import { PortalHomePage } from "../features/portal/pages/PortalHomePage";
import { AppShell } from "../shared/layout/AppShell";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/apps" element={<AppRegistryPage />} />
        <Route path="/cockpit" element={<CockpitPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
