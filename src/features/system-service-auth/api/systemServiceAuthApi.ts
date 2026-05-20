import { apiRequest } from "../../../shared/api/httpClient";
import type {
  SystemServiceAuthCapabilityListResponse,
  SystemServiceAuthPermissionCreatePayload,
  SystemServiceAuthPermissionDTO,
  SystemServiceAuthPermissionListResponse,
  SystemServiceAuthPermissionUpdatePayload,
  SystemServiceAuthWriteRunDTO,
  SystemServiceAuthWriteStatusListResponse,
} from "../contracts/systemServiceAuth";

type FetchSystemServiceAuthCapabilitiesParams = {
  targetAppCode?: string;
};

function buildCapabilityQuery(params: FetchSystemServiceAuthCapabilitiesParams): string {
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
    `/admin/system-service-auth/capabilities${buildCapabilityQuery(params)}`,
    {
      token,
    },
  );
}

export function fetchSystemServiceAuthPermissions(
  token: string,
): Promise<SystemServiceAuthPermissionListResponse> {
  return apiRequest<SystemServiceAuthPermissionListResponse>(
    "/admin/system-service-auth/permissions",
    {
      token,
    },
  );
}

export function createSystemServiceAuthPermission(
  token: string,
  payload: SystemServiceAuthPermissionCreatePayload,
): Promise<SystemServiceAuthPermissionDTO> {
  return apiRequest<SystemServiceAuthPermissionDTO>("/admin/system-service-auth/permissions", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateSystemServiceAuthPermission(
  token: string,
  permissionId: number,
  payload: SystemServiceAuthPermissionUpdatePayload,
): Promise<SystemServiceAuthPermissionDTO> {
  return apiRequest<SystemServiceAuthPermissionDTO>(
    `/admin/system-service-auth/permissions/${permissionId}`,
    {
      method: "PATCH",
      token,
      body: payload,
    },
  );
}

export function applySystemServiceAuthPermission(
  token: string,
  permissionId: number,
): Promise<SystemServiceAuthWriteRunDTO> {
  return apiRequest<SystemServiceAuthWriteRunDTO>(
    `/admin/system-service-auth/permissions/${permissionId}/apply`,
    {
      method: "POST",
      token,
    },
  );
}

export function verifySystemServiceAuthPermission(
  token: string,
  permissionId: number,
): Promise<SystemServiceAuthWriteRunDTO> {
  return apiRequest<SystemServiceAuthWriteRunDTO>(
    `/admin/system-service-auth/permissions/${permissionId}/verify`,
    {
      method: "POST",
      token,
    },
  );
}

export function fetchSystemServiceAuthWriteStatus(
  token: string,
): Promise<SystemServiceAuthWriteStatusListResponse> {
  return apiRequest<SystemServiceAuthWriteStatusListResponse>(
    "/admin/system-service-auth/write-status",
    {
      token,
    },
  );
}
