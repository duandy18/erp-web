export type SystemIamSyncRunDTO = {
  id: number;
  app_code: string;
  source_base_url: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  source_snapshot_at: string | null;
  fetched_count: number;
  inserted_count: number;
  updated_count: number;
  deleted_count: number;
  error_message: string | null;
  raw_excerpt: string | null;
};

export type SystemIamAppDTO = {
  app_code: string;
  app_name: string;
  app_type: string;
  status: string;
  is_active: boolean;
};

export type SystemIamUserDTO = {
  app_code: string;
  source_user_id: number;
  username: string;
  is_active: boolean;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  last_synced_at: string | null;
};

export type SystemIamPermissionDTO = {
  app_code: string;
  source_permission_id: number;
  permission_code: string;
  last_synced_at: string | null;
};

export type SystemIamUserPermissionDTO = {
  app_code: string;
  source_user_id: number;
  source_permission_id: number;
  permission_code: string;
  granted_at: string | null;
  last_synced_at: string | null;
};

export type SystemIamPageDTO = {
  app_code: string;
  page_code: string;
  page_name: string;
  parent_page_code: string | null;
  level: number;
  domain_code: string | null;
  show_in_topbar: boolean;
  show_in_sidebar: boolean;
  inherit_permissions: boolean;
  read_permission_code: string | null;
  write_permission_code: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  last_synced_at: string | null;
};

export type SystemIamPageRoutePrefixDTO = {
  app_code: string;
  page_code: string;
  route_prefix: string;
  sort_order: number | null;
  is_active: boolean | null;
  last_synced_at: string | null;
};

export type IndependentSystemUserPermissionsResponse = {
  apps: SystemIamAppDTO[];
  users: SystemIamUserDTO[];
  permissions: SystemIamPermissionDTO[];
  user_permissions: SystemIamUserPermissionDTO[];
  page_registry: SystemIamPageDTO[];
  page_route_prefixes: SystemIamPageRoutePrefixDTO[];
  latest_sync_runs: SystemIamSyncRunDTO[];
};
