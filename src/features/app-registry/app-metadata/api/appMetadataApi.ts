import { apiRequest } from "../../../../shared/api/httpClient";
import type { AppRegistryMetadataProfilesResponse } from "../contracts/appMetadata";

export function fetchAppRegistryMetadataProfiles(
  token: string,
): Promise<AppRegistryMetadataProfilesResponse> {
  return apiRequest<AppRegistryMetadataProfilesResponse>("/admin/app-registry/app-metadata", {
    token,
  });
}
