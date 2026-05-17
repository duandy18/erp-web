import { apiRequest } from "../../../shared/api/httpClient";
import type {
  SystemMonitoringDatabasesResponse,
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

export function fetchSystemMonitoringDatabases(
  token: string,
): Promise<SystemMonitoringDatabasesResponse> {
  return apiRequest<SystemMonitoringDatabasesResponse>("/admin/system-monitoring/databases", {
    token,
  });
}
