import { apiRequest } from "../../../shared/api/httpClient";
import type { RegisteredAppsResponse } from "../contracts/appRegistry";

export function fetchRegisteredApps(token: string): Promise<RegisteredAppsResponse> {
  return apiRequest<RegisteredAppsResponse>("/erp/app-registry/apps", {
    token,
  });
}
