import { apiRequest } from "../../../shared/api/httpClient";
import type { SystemMonitoringOverview } from "../contracts/systemMonitoring";

export function fetchSystemMonitoringOverview(
  token: string,
): Promise<SystemMonitoringOverview> {
  return apiRequest<SystemMonitoringOverview>("/admin/system-monitoring/overview", {
    token,
  });
}
