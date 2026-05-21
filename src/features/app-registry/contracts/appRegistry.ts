export type AppRegistrationStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type RegisteredApp = {
  code: string;
  name: string;
  description: string;
  web_path: string;
  api_path: string;
  registration_status?: AppRegistrationStatus;
  registration_reason?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by_user_id?: number | null;
  sort_order: number;
  is_active: boolean;
};

export type RegisteredAppsResponse = {
  apps: RegisteredApp[];
};
