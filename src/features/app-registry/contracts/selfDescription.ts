export type AppSelfDescriptionSyncRunDTO = {
  id: number;
  app_code: string;
  sync_type: string;
  source_base_url: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  fetched_count: number;
  inserted_count: number;
  updated_count: number;
  deleted_count: number;
  error_message: string | null;
  raw_excerpt: string | null;
};

export type AppSelfDescriptionEndpointDTO = {
  code: string;
  method: string;
  path: string;
  purpose: string;
  is_required: boolean;
  is_active: boolean;
  auth_policy: string;
};

export type AppSelfDescriptionAppInfoDTO = {
  app_code: string;
  app_name: string;
  app_type: string;
  owner_domain: string;
  status: string;
  description: string;
};

export type AppSelfDescriptionDeploymentDTO = {
  env_code: string;
  deployment_mode: string;
  web_path: string;
  api_path: string;
  control_base_url: string;
  internal_api_base_url: string;
  public_web_url: string;
  public_api_base_url: string | null;
};

export type AppSelfDescriptionServiceIdentityDTO = {
  service_client_code: string;
  service_client_header: string;
};

export type AppSelfDescriptionSecurityPolicyDTO = {
  self_description_auth_policy: string;
  write_auth_policy: string;
  required_write_caller: string;
};

export type AppSelfDescriptionBuildDTO = {
  app_version: string;
  git_sha: string | null;
  image_tag: string | null;
  build_time: string | null;
};

export type AppSelfDescriptionManifestDTO = {
  manifest_contract_version: string;
  generated_at: string;
  app: AppSelfDescriptionAppInfoDTO;
  deployment: AppSelfDescriptionDeploymentDTO;
  service_identity: AppSelfDescriptionServiceIdentityDTO;
  control_endpoints: AppSelfDescriptionEndpointDTO[];
  write_endpoints: AppSelfDescriptionEndpointDTO[];
  security: AppSelfDescriptionSecurityPolicyDTO;
  build: AppSelfDescriptionBuildDTO;
  last_synced_at: string | null;
};

export type AppSelfDescriptionPageDTO = {
  page_code: string;
  page_name: string;
  route_path: string | null;
  parent_page_code: string | null;
  level: number;
  read_permission_code: string | null;
  write_permission_code: string | null;
  is_active: boolean;
  sort_order: number;
  source_updated_at: string | null;
  last_synced_at: string | null;
};

export type AppSelfDescriptionCapabilityRouteDTO = {
  http_method: string;
  path: string;
  route_name: string;
  auth_required: boolean;
  is_active: boolean;
  source_created_at: string | null;
  last_synced_at: string | null;
};

export type AppSelfDescriptionCapabilityDTO = {
  capability_code: string;
  capability_name: string;
  resource_code: string;
  permission_code: string;
  description: string | null;
  is_active: boolean;
  source_updated_at: string | null;
  last_synced_at: string | null;
  routes: AppSelfDescriptionCapabilityRouteDTO[];
};

export type AppSelfDescriptionDependencyEndpointDTO = {
  http_method: string;
  path: string;
  purpose: string | null;
  last_synced_at: string | null;
};

export type AppSelfDescriptionDependencyDTO = {
  dependency_code: string;
  dependency_name: string;
  target_app_code: string;
  target_capability_code: string;
  required_permission_code: string;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  required_config_keys: string[];
  source_modules: string[];
  last_synced_at: string | null;
  endpoints: AppSelfDescriptionDependencyEndpointDTO[];
};

export type AppSelfDescriptionDTO = {
  app_code: string;
  app_name: string;
  manifest: AppSelfDescriptionManifestDTO | null;
  pages: AppSelfDescriptionPageDTO[];
  capabilities: AppSelfDescriptionCapabilityDTO[];
  dependencies: AppSelfDescriptionDependencyDTO[];
  latest_sync_run: AppSelfDescriptionSyncRunDTO | null;
};
