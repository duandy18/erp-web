export type AppMetadataApp = {
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

export type AppMetadataComponent = {
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

export type AppMetadataEnvironment = {
  env_code: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

export type AppMetadataAppEnvironment = {
  id: number;
  app_code: string;
  env_code: string;
  display_name: string;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
};

export type AppMetadataRepository = {
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

export type AppMetadataGatewayBinding = {
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

export type AppRegistryMetadataProfile = {
  app: AppMetadataApp;
  components: AppMetadataComponent[];
  environments: AppMetadataEnvironment[];
  app_environments: AppMetadataAppEnvironment[];
  repositories: AppMetadataRepository[];
  gateway_bindings: AppMetadataGatewayBinding[];
};

export type AppRegistryMetadataProfilesResponse = {
  profiles: AppRegistryMetadataProfile[];
};
