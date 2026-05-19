import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  AppIamPermissionMatrixDTO,
  AppIamUserDesiredSavePayload,
  AppIamWriteRunDTO,
} from "../contracts/appPermissions";

export function fetchAppIamPermissionMatrix(token: string): Promise<AppIamPermissionMatrixDTO> {
  return apiRequest<AppIamPermissionMatrixDTO>("/admin/app-iam/permission-matrix", {
    token,
  });
}

export function saveAppIamUserDesired(
  token: string,
  userId: number,
  payload: AppIamUserDesiredSavePayload,
): Promise<AppIamPermissionMatrixDTO> {
  return apiRequest<AppIamPermissionMatrixDTO>(`/admin/app-iam/users/${userId}/desired`, {
    method: "PUT",
    token,
    body: payload,
  });
}

export function applyAppIam(token: string, appCode: string): Promise<AppIamWriteRunDTO> {
  return apiRequest<AppIamWriteRunDTO>(
    `/admin/app-iam/apps/${encodeURIComponent(appCode)}/apply`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}

export function verifyAppIam(token: string, appCode: string): Promise<AppIamWriteRunDTO> {
  return apiRequest<AppIamWriteRunDTO>(
    `/admin/app-iam/apps/${encodeURIComponent(appCode)}/verify`,
    {
      method: "POST",
      token,
      body: {},
    },
  );
}
