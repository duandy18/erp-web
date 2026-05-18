import { apiRequest } from "../../../shared/api/httpClient";
import type {
  IndependentSystemUserPermissionsResponse,
  SystemIamSyncRunDTO,
} from "../contracts/systemIam";

type FetchIndependentSystemUserPermissionsParams = {
  appCode?: string;
};

function buildQuery(params: FetchIndependentSystemUserPermissionsParams): string {
  const query = new URLSearchParams();

  const appCode = params.appCode?.trim();
  if (appCode) {
    query.set("app_code", appCode);
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function fetchIndependentSystemUserPermissions(
  token: string,
  params: FetchIndependentSystemUserPermissionsParams = {},
): Promise<IndependentSystemUserPermissionsResponse> {
  return apiRequest<IndependentSystemUserPermissionsResponse>(
    `/admin/system-iam/independent-system-user-permissions${buildQuery(params)}`,
    {
      token,
    },
  );
}

export function syncIndependentSystemIamSnapshot(
  token: string,
  appCode: string,
): Promise<SystemIamSyncRunDTO> {
  return apiRequest<SystemIamSyncRunDTO>(
    `/admin/system-iam/apps/${encodeURIComponent(appCode)}/sync-iam-snapshot`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}
