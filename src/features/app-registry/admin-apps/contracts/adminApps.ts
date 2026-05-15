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
