export type AppIamMatrixSummaryDTO = {
  user_count: number;
  app_count: number;
  app_page_count: number;
  access_count: number;
  permission_count: number;
  latest_apply_success_count: number;
  latest_verify_success_count: number;
};

export type AppIamMatrixUserDTO = {
  user_id: number;
  username: string;
  is_active: boolean;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export type AppIamMatrixAppDTO = {
  app_code: string;
  app_name: string;
  is_active: boolean;
  sort_order: number;
};

export type AppIamMatrixPageDTO = {
  app_code: string;
  page_code: string;
  page_name: string;
  parent_page_code: string | null;
  level: number;
  route_path: string | null;
  read_permission_code: string | null;
  write_permission_code: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AppIamMatrixAccessDTO = {
  user_id: number;
  app_code: string;
  is_active: boolean;
};

export type AppIamMatrixPermissionDTO = {
  user_id: number;
  app_code: string;
  permission_code: string;
  is_active: boolean;
};

export type AppIamWriteRunDTO = {
  run_id: number;
  app_code: string;
  operation: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  target_base_url: string | null;
  http_status: number | null;
  user_count: number;
  desired_permission_count: number;
  error_message: string | null;
  raw_excerpt: string | null;
};

export type AppIamWriteStatusItemDTO = {
  app_code: string;
  app_name: string;
  app_active: boolean;
  target_base_url: string | null;
  latest_apply: AppIamWriteRunDTO | null;
  latest_verify: AppIamWriteRunDTO | null;
};

export type AppIamWriteStatusListDTO = {
  items: AppIamWriteStatusItemDTO[];
  recent_runs: AppIamWriteRunDTO[];
};

export type AppIamPermissionMatrixDTO = {
  summary: AppIamMatrixSummaryDTO;
  users: AppIamMatrixUserDTO[];
  apps: AppIamMatrixAppDTO[];
  app_pages: AppIamMatrixPageDTO[];
  user_app_access: AppIamMatrixAccessDTO[];
  user_app_permissions: AppIamMatrixPermissionDTO[];
  write_status: AppIamWriteStatusListDTO;
};

export type AppIamDesiredPermissionPayload = {
  permission_code: string;
  is_active: boolean;
};

export type AppIamDesiredAppPayload = {
  app_code: string;
  is_active: boolean;
  permissions: AppIamDesiredPermissionPayload[];
};

export type AppIamUserDesiredSavePayload = {
  apps: AppIamDesiredAppPayload[];
};
