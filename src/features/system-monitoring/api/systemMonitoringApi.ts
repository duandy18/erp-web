import { apiRequest } from "../../../shared/api/httpClient";
import type {
  SystemMonitoringDatabasesResponse,
  SystemMonitoringDependenciesResponse,
  SystemMonitoringEndpointsResponse,
  SystemMonitoringGatewayResponse,
  SystemMonitoringHealthCheckRun,
  SystemMonitoringHealthResponse,
  SystemMonitoringOpenApiResponse,
  SystemMonitoringOverview,
  SystemMonitoringServiceAuthResponse,
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

export function fetchSystemMonitoringGateway(
  token: string,
): Promise<SystemMonitoringGatewayResponse> {
  return apiRequest<SystemMonitoringGatewayResponse>("/admin/system-monitoring/gateway", {
    token,
  });
}

export function fetchSystemMonitoringDependencies(
  token: string,
): Promise<SystemMonitoringDependenciesResponse> {
  return apiRequest<SystemMonitoringDependenciesResponse>(
    "/admin/system-monitoring/dependencies",
    { token },
  );
}

export function fetchSystemMonitoringServiceAuth(
  token: string,
): Promise<SystemMonitoringServiceAuthResponse> {
  return apiRequest<SystemMonitoringServiceAuthResponse>(
    "/admin/system-monitoring/service-auth",
    { token },
  );
}

export function fetchSystemMonitoringOpenApi(
  token: string,
): Promise<SystemMonitoringOpenApiResponse> {
  return apiRequest<SystemMonitoringOpenApiResponse>("/admin/system-monitoring/openapi", {
    token,
  });
}

export function fetchSystemMonitoringHealth(
  token: string,
): Promise<SystemMonitoringHealthResponse> {
  return apiRequest<SystemMonitoringHealthResponse>("/admin/system-monitoring/health", {
    token,
  });
}

export function runSystemMonitoringHealthCheck(
  token: string,
  healthCheckId: number,
): Promise<SystemMonitoringHealthCheckRun> {
  return apiRequest<SystemMonitoringHealthCheckRun>(
    `/admin/app-registry/health-checks/${healthCheckId}/run`,
    {
      method: "POST",
      token,
    },
  );
}
