export type SystemServiceAuthCapabilityRouteDTO = {
  http_method: string;
  path: string;
  route_name: string;
  auth_required: boolean;
  is_active: boolean;
  source_created_at: string | null;
  last_synced_at: string | null;
};

export type SystemServiceAuthCapabilityDTO = {
  target_app_code: string;
  target_app_name: string;
  capability_code: string;
  capability_name: string;
  resource_code: string;
  permission_code: string;
  description: string | null;
  is_active: boolean;
  source_updated_at: string | null;
  last_synced_at: string | null;
  route_count: number;
  routes: SystemServiceAuthCapabilityRouteDTO[];
};

export type SystemServiceAuthCapabilityListResponse = {
  capabilities: SystemServiceAuthCapabilityDTO[];
};

export type SystemServiceAuthClientDTO = {
  client_id: number;
  app_code: string;
  app_name: string;
  client_code: string;
  client_name: string;
  auth_type: string;
  secret_ref: string | null;
  is_active: boolean;
};

export type SystemServiceAuthCapabilityOptionDTO = {
  target_app_code: string;
  target_app_name: string;
  capability_code: string;
  capability_name: string;
  permission_code: string;
  description: string | null;
  is_active: boolean;
  last_synced_at: string | null;
};

export type SystemServiceAuthPermissionDTO = {
  permission_id: number;
  client_id: number;
  client_code: string | null;
  source_app_code: string;
  source_app_name: string;
  target_app_code: string;
  target_app_name: string;
  permission_code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  capability_code: string | null;
  capability_name: string | null;
  capability_active: boolean | null;
};

export type SystemServiceAuthPermissionListResponse = {
  clients: SystemServiceAuthClientDTO[];
  capability_options: SystemServiceAuthCapabilityOptionDTO[];
  permissions: SystemServiceAuthPermissionDTO[];
};

export type SystemServiceAuthPermissionCreatePayload = {
  client_id: number;
  target_app_code: string;
  permission_code: string;
  description: string;
  is_active: boolean;
};

export type SystemServiceAuthPermissionUpdatePayload = {
  description?: string;
  is_active?: boolean;
};

export type SystemServiceAuthWriteRunDTO = {
  run_id: number;
  permission_id: number;
  source_app_code: string;
  target_app_code: string;
  client_code: string | null;
  permission_code: string;
  operation: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  target_base_url: string | null;
  http_status: number | null;
  error_message: string | null;
  raw_excerpt: string | null;
};

export type SystemServiceAuthWriteStatusItemDTO = {
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
  latest_run: SystemServiceAuthWriteRunDTO | null;
};

export type SystemServiceAuthWriteStatusListResponse = {
  items: SystemServiceAuthWriteStatusItemDTO[];
  recent_runs: SystemServiceAuthWriteRunDTO[];
};
