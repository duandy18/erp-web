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
