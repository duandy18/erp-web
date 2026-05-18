import { apiRequest } from "../../../shared/api/httpClient";
import type { AppSelfDescriptionDTO } from "../contracts/selfDescription";

export function fetchAdminAppSelfDescription(
  token: string,
  code: string,
): Promise<AppSelfDescriptionDTO> {
  return apiRequest<AppSelfDescriptionDTO>(
    `/admin/app-registry/apps/${code}/self-description`,
    {
      token,
    },
  );
}
