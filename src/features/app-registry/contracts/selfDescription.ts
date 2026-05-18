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

export type AppSelfDescriptionManifestDTO = {
  app_code: string;
  app_name: string;
  app_type: string;
  status: string;
  description: string;
  default_web_path: string;
  default_api_path: string;
  local_web_url: string;
  local_api_url: string;
  health_url: string;
  db_health_url: string | null;
  openapi_url: string;
  page_catalog_url: string;
  service_capabilities_url: string;
  service_dependencies_url: string;
  version: string;
  build_environment: string | null;
  build_git_sha: string | null;
  build_time: string | null;
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

export type AppSelfDescriptionDTO = {
  app_code: string;
  app_name: string;
  manifest: AppSelfDescriptionManifestDTO | null;
  pages: AppSelfDescriptionPageDTO[];
  capabilities: unknown[];
  dependencies: unknown[];
  latest_sync_run: AppSelfDescriptionSyncRunDTO | null;
};
