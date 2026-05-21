import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  AdminAppsResponse,
  AdminAppRegistrationEventDTO,
  AdminAppRegistrationEventsResponse,
  AdminAppRegistrationRequestCreatePayload,
  AdminAppRegistrationRequestDTO,
  AdminAppRegistrationRequestsResponse,
  AdminAppRegistrationReviewPayload,
  AdminAppSelfDescriptionSyncRunDTO,
} from "../contracts/adminApps";

export function fetchAdminApps(token: string): Promise<AdminAppsResponse> {
  return apiRequest<AdminAppsResponse>("/admin/app-registry/apps", {
    token,
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
