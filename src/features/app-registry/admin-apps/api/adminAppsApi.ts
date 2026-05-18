import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  AdminAppCreatePayload,
  AdminAppDTO,
  AdminAppsResponse,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppUpdatePayload,
} from "../contracts/adminApps";

export function fetchAdminApps(token: string): Promise<AdminAppsResponse> {
  return apiRequest<AdminAppsResponse>("/admin/app-registry/apps", {
    token,
  });
}

export function createAdminApp(
  token: string,
  payload: AdminAppCreatePayload,
): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>("/admin/app-registry/apps", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateAdminApp(
  token: string,
  code: string,
  payload: AdminAppUpdatePayload,
): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${code}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function syncAdminAppSelfDescription(
  token: string,
  code: string,
): Promise<AdminAppSelfDescriptionSyncRunDTO> {
  return apiRequest<AdminAppSelfDescriptionSyncRunDTO>(
    `/admin/app-registry/apps/${code}/sync-self-description`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export function enableAdminApp(token: string, code: string): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${code}/enable`, {
    method: "POST",
    token,
    body: {},
  });
}

export function disableAdminApp(token: string, code: string): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${code}/disable`, {
    method: "POST",
    token,
    body: {},
  });
}
