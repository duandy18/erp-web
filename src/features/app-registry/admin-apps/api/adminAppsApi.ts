import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  AdminAppDTO,
  AdminAppsResponse,
  AdminAppRegistrationEventDTO,
  AdminAppRegistrationEventsResponse,
  AdminAppRegistrationRequestCreatePayload,
  AdminAppRegistrationRequestDTO,
  AdminAppRegistrationRequestsResponse,
  AdminAppRegistrationReviewPayload,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppUpdatePayload,
} from "../contracts/adminApps";

export function fetchAdminApps(token: string): Promise<AdminAppsResponse> {
  return apiRequest<AdminAppsResponse>("/admin/app-registry/apps", {
    token,
  });
}

export function updateAdminApp(
  token: string,
  code: string,
  payload: AdminAppUpdatePayload,
): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${encodeURIComponent(code)}`, {
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
    `/admin/app-registry/apps/${encodeURIComponent(code)}/sync-self-description`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export function enableAdminApp(token: string, code: string): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${encodeURIComponent(code)}/enable`, {
    method: "POST",
    token,
    body: {},
  });
}

export function disableAdminApp(token: string, code: string): Promise<AdminAppDTO> {
  return apiRequest<AdminAppDTO>(`/admin/app-registry/apps/${encodeURIComponent(code)}/disable`, {
    method: "POST",
    token,
    body: {},
  });
}

export function fetchRegistrationRequests(
  token: string,
): Promise<AdminAppRegistrationRequestsResponse> {
  return apiRequest<AdminAppRegistrationRequestsResponse>(
    "/admin/app-registry/registration-requests",
    {
      token,
    },
  );
}

export function createRegistrationRequestFromManifest(
  token: string,
  payload: AdminAppRegistrationRequestCreatePayload,
): Promise<AdminAppRegistrationRequestDTO> {
  return apiRequest<AdminAppRegistrationRequestDTO>(
    "/admin/app-registry/registration-requests/from-manifest",
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export function approveRegistrationRequest(
  token: string,
  requestId: number,
  payload: AdminAppRegistrationReviewPayload,
): Promise<AdminAppRegistrationRequestDTO> {
  return apiRequest<AdminAppRegistrationRequestDTO>(
    `/admin/app-registry/registration-requests/${requestId}/approve`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export function rejectRegistrationRequest(
  token: string,
  requestId: number,
  payload: AdminAppRegistrationReviewPayload,
): Promise<AdminAppRegistrationRequestDTO> {
  return apiRequest<AdminAppRegistrationRequestDTO>(
    `/admin/app-registry/registration-requests/${requestId}/reject`,
    {
      method: "POST",
      token,
      body: payload,
    },
  );
}

export function fetchRegistrationRequestEvents(
  token: string,
  requestId: number,
): Promise<AdminAppRegistrationEventDTO[]> {
  return apiRequest<AdminAppRegistrationEventsResponse>(
    `/admin/app-registry/registration-requests/${requestId}/events`,
    {
      token,
    },
  ).then((response) => response.events);
}
