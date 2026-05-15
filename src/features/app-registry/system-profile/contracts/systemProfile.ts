export type SystemProfileApp = {
  code: string;
  name: string;
  description: string;
  web_path: string;
  api_path: string;
  local_web_url: string;
  local_api_url: string;
  status: string;
  domain_code: string;
  app_type: string;
  owner_name: string | null;
  owner_contact: string | null;
  sort_order: number;
  is_active: boolean;
};

export type SystemProfileComponent = {
  id: number;
  app_code: string;
  component_code: string;
  component_type: string;
  name: string;
  description: string;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

export type SystemProfileEnvironment = {
  env_code: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type SystemProfileAppEnvironment = {
  id: number;
  app_code: string;
  env_code: string;
  display_name: string;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
};

export type SystemProfileEndpoint = {
  id: number;
  app_code: string;
  component_id: number | null;
  env_code: string;
  endpoint_type: string;
  name: string;
  method: string | null;
  path: string | null;
  url: string;
  auth_required: boolean;
  timeout_ms: number;
  is_active: boolean;
  sort_order: number;
};

export type SystemProfileDatabase = {
  id: number;
  app_code: string;
  env_code: string;
  db_engine: string;
  db_host_label: string;
  db_port: number;
  db_name: string;
  schema_name: string;
  migration_tool: string | null;
  migration_command: string | null;
  health_endpoint_id: number | null;
  secret_ref: string | null;
  access_policy: string;
  is_active: boolean;
  notes: string | null;
};

export type SystemProfileRepository = {
  id: number;
  app_code: string;
  component_id: number | null;
  repo_type: string;
  provider: string;
  repo_owner: string;
  repo_name: string;
  default_branch: string;
  local_path: string | null;
  ci_workflow_name: string | null;
  is_active: boolean;
};

export type SystemProfileGatewayBinding = {
  id: number;
  app_code: string;
  env_code: string;
  web_path: string;
  api_path: string;
  web_upstream_url: string | null;
  api_upstream_url: string | null;
  rewrite_mode: string;
  is_published: boolean;
  published_at: string | null;
  is_active: boolean;
};

export type SystemProfileDependency = {
  id: number;
  source_app_code: string;
  target_app_code: string;
  dependency_type: string;
  description: string;
  is_required: boolean;
  status: string;
  is_active: boolean;
};

export type SystemProfileServiceClient = {
  id: number;
  app_code: string;
  client_code: string;
  client_name: string;
  auth_type: string;
  secret_ref: string | null;
  is_active: boolean;
};

export type SystemProfileServicePermission = {
  id: number;
  client_id: number;
  source_app_code: string;
  target_app_code: string;
  permission_code: string;
  description: string;
  is_active: boolean;
};

export type AppRegistrySystemProfile = {
  app: SystemProfileApp;
  components: SystemProfileComponent[];
  environments: SystemProfileEnvironment[];
  app_environments: SystemProfileAppEnvironment[];
  endpoints: SystemProfileEndpoint[];
  databases: SystemProfileDatabase[];
  repositories: SystemProfileRepository[];
  gateway_bindings: SystemProfileGatewayBinding[];
  outgoing_dependencies: SystemProfileDependency[];
  incoming_dependencies: SystemProfileDependency[];
  service_clients: SystemProfileServiceClient[];
  service_permissions: SystemProfileServicePermission[];
};

export type AppRegistrySystemProfilesResponse = {
  profiles: AppRegistrySystemProfile[];
};
