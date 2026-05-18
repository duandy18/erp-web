import type { RegisteredApp } from "../../contracts/appRegistry";

export type AdminAppDTO = RegisteredApp;

export type AdminAppsResponse = {
  apps: AdminAppDTO[];
};

export type AdminAppStatus = AdminAppDTO["status"];

export type AdminAppCreatePayload = {
  code: string;
  name: string;
  description: string;
  web_path: string;
  api_path: string;
  local_web_url: string;
  local_api_url: string;
  status: AdminAppStatus;
  sort_order: number;
  is_active: boolean;
};

export type AdminAppUpdatePayload = Partial<Omit<AdminAppCreatePayload, "code">>;

export type AdminAppSelfDescriptionSyncRunDTO = {
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
