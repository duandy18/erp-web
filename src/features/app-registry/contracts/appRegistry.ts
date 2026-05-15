export type RegisteredApp = {
  code: string;
  name: string;
  description: string;
  web_path: string;
  api_path: string;
  local_web_url: string;
  local_api_url: string;
  status: "ready" | "planned";
  sort_order: number;
  is_active: boolean;
};

export type RegisteredAppsResponse = {
  apps: RegisteredApp[];
};
