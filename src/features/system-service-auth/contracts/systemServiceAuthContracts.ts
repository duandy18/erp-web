export type SystemServiceAuthContractEndpointDTO = {
  http_method: string;
  path: string;
  purpose: string | null;
  last_synced_at: string | null;
};

export type SystemServiceAuthContractRouteDTO = {
  http_method: string;
  path: string;
  route_name: string;
  auth_required: boolean;
  is_active: boolean;
  last_synced_at: string | null;
};

export type SystemServiceAuthContractWriteRunDTO = {
  run_id: number;
  operation: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  target_base_url: string | null;
  http_status: number | null;
  error_message: string | null;
  raw_excerpt: string | null;
};

export type SystemServiceAuthContractDTO = {
  contract_code: string;
  contract_name: string;
  contract_scope: string;
  contract_type: string;
  contract_status: string;
  issue_summary: string | null;

  source_app_code: string;
  source_app_name: string;
  target_app_code: string;
  target_app_name: string;

  app_active: boolean | null;
  web_path: string | null;
  api_path: string | null;
  local_api_url: string | null;
  manifest_synced_at: string | null;

  dependency_code: string | null;
  dependency_name: string | null;
  dependency_description: string | null;
  dependency_active: boolean | null;
  is_required: boolean | null;
  dependency_last_synced_at: string | null;
  required_config_keys: string[];
  source_modules: string[];

  target_capability_code: string | null;
  target_capability_name: string | null;
  target_capability_exists: boolean | null;
  target_capability_active: boolean | null;
  target_resource_code: string | null;

  required_permission_code: string | null;
  permission_id: number | null;
  permission_configured: boolean;
  permission_active: boolean | null;
  client_code: string | null;

  latest_apply_run: SystemServiceAuthContractWriteRunDTO | null;
  latest_verify_run: SystemServiceAuthContractWriteRunDTO | null;

  endpoint_count: number;
  dependency_endpoints: SystemServiceAuthContractEndpointDTO[];

  route_count: number;
  capability_routes: SystemServiceAuthContractRouteDTO[];
};

export type SystemServiceAuthContractCatalogResponse = {
  contracts: SystemServiceAuthContractDTO[];
};
