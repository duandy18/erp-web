import type { RegisteredApp } from "../../contracts/appRegistry";

export type AdminAppDTO = RegisteredApp;

export type AdminAppsResponse = {
  apps: AdminAppDTO[];
};

export type AdminAppStatus = AdminAppDTO["status"];

export type AdminAppUpdatePayload = Partial<
  Pick<
    AdminAppDTO,
    | "name"
    | "description"
    | "web_path"
    | "api_path"
    | "local_web_url"
    | "local_api_url"
    | "status"
    | "sort_order"
    | "is_active"
  >
>;

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

export type AdminAppRegistrationRequestCreatePayload = {
  control_base_url?: string;
  manifest_url?: string;
  reason?: string;
};

export type AdminAppRegistrationReviewPayload = {
  reason?: string;
};

export type AdminAppRegistrationProposedAppDTO = {
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
  control_base_url: string;
  internal_api_base_url: string;
  public_web_url: string;
  public_api_base_url: string | null;
  service_client_code: string;
  service_client_header: string;
  manifest_contract_version: string;
  deployment_mode: string;
};

export type AdminAppRegistrationRequestDTO = {
  request_id: number;
  status: "pending_review" | "approved" | "rejected" | "superseded" | string;
  manifest_url: string;
  control_base_url: string;
  requested_app_code: string;
  requested_app_name: string;
  requested_app_description: string;
  validation_status: "passed" | "failed" | string;
  validation_errors: string[];
  proposed_app: AdminAppRegistrationProposedAppDTO;
  submitted_by_user_id: number | null;
  reviewed_by_user_id: number | null;
  request_reason: string | null;
  review_reason: string | null;
  approved_app_code: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  manifest: Record<string, unknown>;
};

export type AdminAppRegistrationRequestsResponse = {
  requests: AdminAppRegistrationRequestDTO[];
};

export type AdminAppRegistrationEventDTO = {
  id: number;
  request_id: number;
  app_code: string | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  operator_user_id: number | null;
  reason: string | null;
  created_at: string;
};

export type AdminAppRegistrationEventsResponse = {
  events: AdminAppRegistrationEventDTO[];
};
