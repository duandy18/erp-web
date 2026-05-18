export type SystemServiceAuthCapabilityRouteDTO = {
  http_method: string;
  path: string;
  route_name: string;
  auth_required: boolean;
  is_active: boolean;
  source_created_at: string | null;
  last_synced_at: string | null;
};

export type SystemServiceAuthCapabilityDTO = {
  target_app_code: string;
  target_app_name: string;
  capability_code: string;
  capability_name: string;
  resource_code: string;
  permission_code: string;
  description: string | null;
  is_active: boolean;
  source_updated_at: string | null;
  last_synced_at: string | null;
  route_count: number;
  routes: SystemServiceAuthCapabilityRouteDTO[];
};

export type SystemServiceAuthCapabilityListResponse = {
  capabilities: SystemServiceAuthCapabilityDTO[];
};
