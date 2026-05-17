export type SystemMonitoringStatus =
  | "ok"
  | "warning"
  | "error"
  | "timeout"
  | "unchecked"
  | "not_configured";

export type SystemMonitoringSummary = {
  app_count: number;
  normal_count: number;
  warning_count: number;
  error_count: number;
  unchecked_count: number;
};

export type SystemMonitoringAppStatus = {
  app_code: string;
  app_name: string;
  app_status: string;
  is_active: boolean;
  web_path: string;
  api_path: string;
  gateway_status: SystemMonitoringStatus;
  api_health_status: SystemMonitoringStatus;
  db_health_status: SystemMonitoringStatus;
  openapi_status: SystemMonitoringStatus;
  service_auth_status: SystemMonitoringStatus;
  dependency_status: SystemMonitoringStatus;
  overall_status: SystemMonitoringStatus;
  latest_checked_at: string | null;
  issue_summary: string | null;
};

export type SystemMonitoringOverview = {
  summary: SystemMonitoringSummary;
  apps: SystemMonitoringAppStatus[];
};

export type SystemMonitoringEndpointStatus = {
  app_code: string;
  app_name: string;
  env_code: string | null;
  api_endpoint_id: number | null;
  health_endpoint_id: number | null;
  api_url: string | null;
  health_url: string | null;
  api_endpoint_active: boolean;
  health_endpoint_active: boolean;
  health_check_id: number | null;
  status: SystemMonitoringStatus;
  http_status: number | null;
  latency_ms: number | null;
  latest_checked_at: string | null;
  issue_summary: string | null;
};

export type SystemMonitoringEndpointsResponse = {
  endpoints: SystemMonitoringEndpointStatus[];
};

export type SystemMonitoringDatabaseStatus = {
  app_code: string;
  app_name: string;
  env_code: string;
  database_id: number;
  db_engine: string;
  db_host_label: string;
  db_port: number;
  db_name: string;
  schema_name: string;
  migration_tool: string | null;
  migration_command: string | null;
  access_policy: string;
  database_active: boolean;
  health_endpoint_id: number | null;
  health_url: string | null;
  health_endpoint_active: boolean;
  health_check_id: number | null;
  status: SystemMonitoringStatus;
  http_status: number | null;
  latency_ms: number | null;
  latest_checked_at: string | null;
  issue_summary: string | null;
};

export type SystemMonitoringDatabasesResponse = {
  databases: SystemMonitoringDatabaseStatus[];
};

export type SystemMonitoringGatewayBinding = {
  binding_id: number;
  app_code: string;
  app_name: string;
  env_code: string;
  web_path: string;
  api_path: string;
  web_upstream_url: string | null;
  api_upstream_url: string | null;
  rewrite_mode: string;
  is_published: boolean;
  published_at: string | null;
  binding_active: boolean;
  status: SystemMonitoringStatus;
  issue_summary: string | null;
};

export type SystemMonitoringGatewayResponse = {
  gateway_bindings: SystemMonitoringGatewayBinding[];
};

export type SystemMonitoringDependency = {
  dependency_id: number;
  source_app_code: string;
  source_app_name: string;
  target_app_code: string;
  target_app_name: string;
  dependency_type: string;
  description: string;
  is_required: boolean;
  dependency_status: string;
  dependency_active: boolean;
  status: SystemMonitoringStatus;
  issue_summary: string | null;
};

export type SystemMonitoringDependenciesResponse = {
  dependencies: SystemMonitoringDependency[];
};

export type SystemMonitoringServiceClient = {
  client_id: number;
  app_code: string;
  app_name: string;
  client_code: string;
  client_name: string;
  auth_type: string;
  secret_ref: string | null;
  client_active: boolean;
  status: SystemMonitoringStatus;
  issue_summary: string | null;
};

export type SystemMonitoringServicePermission = {
  permission_id: number;
  client_id: number;
  client_code: string | null;
  source_app_code: string;
  source_app_name: string;
  target_app_code: string;
  target_app_name: string;
  permission_code: string;
  description: string;
  permission_active: boolean;
  status: SystemMonitoringStatus;
  issue_summary: string | null;
};

export type SystemMonitoringServiceAuthResponse = {
  clients: SystemMonitoringServiceClient[];
  permissions: SystemMonitoringServicePermission[];
};

export type SystemMonitoringOpenApiSource = {
  source_id: number;
  app_code: string;
  app_name: string;
  env_code: string;
  endpoint_id: number;
  endpoint_url: string | null;
  openapi_url: string;
  last_fetched_at: string | null;
  last_checksum: string | null;
  last_status: string;
  source_active: boolean;
  status: SystemMonitoringStatus;
  issue_summary: string | null;
};

export type SystemMonitoringOpenApiResponse = {
  openapi_sources: SystemMonitoringOpenApiSource[];
};

export type SystemMonitoringHealthCheck = {
  health_check_id: number;
  app_code: string;
  app_name: string;
  env_code: string;
  endpoint_id: number;
  endpoint_type: string | null;
  endpoint_name: string | null;
  endpoint_url: string | null;
  check_type: string;
  expected_status: number;
  timeout_ms: number;
  interval_seconds: number;
  severity: string;
  check_active: boolean;
  endpoint_active: boolean;
  status: SystemMonitoringStatus;
  http_status: number | null;
  latency_ms: number | null;
  latest_checked_at: string | null;
  issue_summary: string | null;
};

export type SystemMonitoringHealthResponse = {
  health_checks: SystemMonitoringHealthCheck[];
};

export type SystemMonitoringHealthCheckRun = {
  id: number;
  health_check_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  message: string | null;
  raw_excerpt: string | null;
};
