import { Navigate, Route, Routes } from "react-router-dom";

import { AppsPage } from "./features/apps/pages/AppsPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { CockpitPage } from "./features/cockpit/pages/CockpitPage";
import { AppShell } from "./features/layout/AppShell";
import { PortalHomePage } from "./features/portal/pages/PortalHomePage";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PortalHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/cockpit" element={<CockpitPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
