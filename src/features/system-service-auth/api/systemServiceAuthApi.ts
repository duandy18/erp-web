import { apiRequest } from "../../../shared/api/httpClient";
import type { SystemServiceAuthCapabilityListResponse } from "../contracts/systemServiceAuth";

type FetchSystemServiceAuthCapabilitiesParams = {
  targetAppCode?: string;
};

function buildQuery(params: FetchSystemServiceAuthCapabilitiesParams): string {
  const query = new URLSearchParams();

  const targetAppCode = params.targetAppCode?.trim();
  if (targetAppCode) {
    query.set("target_app_code", targetAppCode);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function fetchSystemServiceAuthCapabilities(
  token: string,
  params: FetchSystemServiceAuthCapabilitiesParams = {},
): Promise<SystemServiceAuthCapabilityListResponse> {
  return apiRequest<SystemServiceAuthCapabilityListResponse>(
    `/admin/system-service-auth/capabilities${buildQuery(params)}`,
    {
      token,
    },
  );
}
