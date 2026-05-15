import { apiRequest } from "../../../../shared/api/httpClient";
import type {
  PermissionMatrixPagesDTO,
  UserCreatePayload,
  UserDTO,
  UserPermissionMatrixDTO,
  UserPermissionMatrixRawDTO,
  UserUpdatePayload,
} from "../contracts/adminUsers";

type OperationResult = {
  ok: boolean;
  message: string;
};

function toBackendPageUpdates(pageCodes: string[], pages: PermissionMatrixPagesDTO) {
  return pageCodes.map((pageCode) => {
    const cell = pages[pageCode];

    return {
      page_code: pageCode,
      can_read: Boolean(cell?.read),
      can_write: Boolean(cell?.write),
    };
  });
}

export async function fetchUserPermissionMatrix(token: string): Promise<UserPermissionMatrixDTO> {
  const raw = await apiRequest<UserPermissionMatrixRawDTO>("/admin/users/permission-matrix", {
    token,
  });

  return {
    pages: Array.isArray(raw.pages) ? raw.pages : [],
    rows: Array.isArray(raw.users) ? raw.users : [],
  };
}

export function updateUserPermissionMatrix(
  token: string,
  userId: number,
  pageCodes: string[],
  pages: PermissionMatrixPagesDTO,
): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/admin/users/${userId}/permission-matrix`, {
    method: "PUT",
    token,
    body: {
      pages: toBackendPageUpdates(pageCodes, pages),
    },
  });
}

export function fetchUsers(token: string): Promise<UserDTO[]> {
  return apiRequest<UserDTO[]>("/admin/users", {
    token,
  });
}

export function createUser(token: string, payload: UserCreatePayload): Promise<UserDTO> {
  return apiRequest<UserDTO>("/admin/users", {
    method: "POST",
    token,
    body: {
      ...payload,
      permission_ids: [],
    },
  });
}

export function updateUser(
  token: string,
  userId: number,
  payload: UserUpdatePayload,
): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/admin/users/${userId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function deleteUser(token: string, userId: number): Promise<OperationResult> {
  return apiRequest<OperationResult>(`/admin/users/${userId}/delete`, {
    method: "POST",
    token,
    body: {},
  });
}

export function resetUserPassword(token: string, userId: number): Promise<OperationResult> {
  return apiRequest<OperationResult>(`/admin/users/${userId}/reset-password`, {
    method: "POST",
    token,
    body: {},
  });
}
