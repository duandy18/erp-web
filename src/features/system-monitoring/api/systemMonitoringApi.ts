import { apiRequest } from "../../../shared/api/httpClient";
import type {
  SystemMonitoringCheckResult,
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

export function checkSystemMonitoringGateway(
  token: string,
  bindingId: number,
): Promise<SystemMonitoringCheckResult> {
  return apiRequest<SystemMonitoringCheckResult>(
    `/admin/system-monitoring/gateway/${bindingId}/check`,
    {
      method: "POST",
      token,
    },
  );
}

export function checkSystemMonitoringDependency(
  token: string,
  dependencyId: number,
): Promise<SystemMonitoringCheckResult> {
  return apiRequest<SystemMonitoringCheckResult>(
    `/admin/system-monitoring/dependencies/${dependencyId}/check`,
    {
      method: "POST",
      token,
    },
  );
}

export function checkSystemMonitoringServiceClient(
  token: string,
  clientId: number,
): Promise<SystemMonitoringCheckResult> {
  return apiRequest<SystemMonitoringCheckResult>(
    `/admin/system-monitoring/service-auth/clients/${clientId}/check`,
    {
      method: "POST",
      token,
    },
  );
}

export function checkSystemMonitoringServicePermission(
  token: string,
  permissionId: number,
): Promise<SystemMonitoringCheckResult> {
  return apiRequest<SystemMonitoringCheckResult>(
    `/admin/system-monitoring/service-auth/permissions/${permissionId}/check`,
    {
      method: "POST",
      token,
    },
  );
}

export function checkSystemMonitoringOpenApi(
  token: string,
  sourceId: number,
): Promise<SystemMonitoringCheckResult> {
  return apiRequest<SystemMonitoringCheckResult>(
    `/admin/system-monitoring/openapi/${sourceId}/check`,
    {
      method: "POST",
      token,
    },
  );
}
