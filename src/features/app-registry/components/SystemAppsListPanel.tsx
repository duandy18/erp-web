import { useSessionRuntime } from "../../iam/runtime/useSessionRuntime";
import { AdminAppsPanel } from "../admin-apps/components/AdminAppsPanel";
import { useAdminAppsPresenter } from "../admin-apps/hooks/useAdminAppsPresenter";

export function SystemAppsListPanel() {
  const { token } = useSessionRuntime();
  const presenter = useAdminAppsPresenter(token);

  return <AdminAppsPanel presenter={presenter} />;
}
