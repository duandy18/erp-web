import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  AppRegistrySystemProfile,
  AppRegistrySystemProfilesResponse,
} from "../contracts/systemProfile";

export function fetchSystemProfiles(token: string): Promise<AppRegistrySystemProfilesResponse> {
  return apiRequest<AppRegistrySystemProfilesResponse>("/admin/app-registry/system-profile", {
    token,
  });
}

export function fetchSystemProfile(
  token: string,
  appCode: string,
): Promise<AppRegistrySystemProfile> {
  return apiRequest<AppRegistrySystemProfile>(
    `/admin/app-registry/system-profile/${encodeURIComponent(appCode)}`,
    {
      token,
    },
  );
}
