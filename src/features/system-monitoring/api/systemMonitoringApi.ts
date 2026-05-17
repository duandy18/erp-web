import { apiRequest } from "../../../shared/api/httpClient";
import type {
  SystemMonitoringEndpointsResponse,
  SystemMonitoringOverview,
} from "../contracts/systemMonitoring";

export function fetchSystemMonitoringOverview(
  token: string,
): Promise<SystemMonitoringOverview> {
  return apiRequest<SystemMonitoringOverview>("/admin/system-monitoring/overview", {
    token,
  });
}

export function fetchSystemMonitoringEndpoints(
  token: string,
): Promise<SystemMonitoringEndpointsResponse> {
  return apiRequest<SystemMonitoringEndpointsResponse>("/admin/system-monitoring/endpoints", {
    token,
  });
}
