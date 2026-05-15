import { useCallback, useEffect, useState } from "react";

import {
  createUser as apiCreateUser,
  deleteUser as apiDeleteUser,
  fetchUserPermissionMatrix,
  fetchUsers,
  resetUserPassword,
  updateUser as apiUpdateUser,
  updateUserPermissionMatrix as apiUpdateUserPermissionMatrix,
} from "../api/adminUsersApi";
import type {
  PermissionMatrixPageDTO,
  PermissionMatrixPagesDTO,
  PermissionMatrixRowDTO,
  UserCreatePayload,
  UserDTO,
  UserUpdatePayload,
} from "../contracts/adminUsers";

type UserDetailsMap = Record<number, UserDTO>;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useAdminUsersPresenter(token: string | null) {
  const [matrixPages, setMatrixPages] = useState<PermissionMatrixPageDTO[]>([]);
  const [matrixRows, setMatrixRows] = useState<PermissionMatrixRowDTO[]>([]);
  const [userDetailsById, setUserDetailsById] = useState<UserDetailsMap>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setError("缺少登录凭证");
      setMatrixPages([]);
      setMatrixRows([]);
      setUserDetailsById({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [matrix, users] = await Promise.all([
        fetchUserPermissionMatrix(token),
        fetchUsers(token),
      ]);
      const detailMap: UserDetailsMap = {};

      for (const user of users) {
        detailMap[user.id] = user;
      }

      setMatrixPages(matrix.pages);
      setMatrixRows(matrix.rows);
      setUserDetailsById(detailMap);
    } catch (currentError) {
      setError(errorMessage(currentError, "加载用户权限矩阵失败"));
      setMatrixPages([]);
      setMatrixRows([]);
      setUserDetailsById({});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  async function createUser(payload: UserCreatePayload): Promise<void> {
    setCreating(true);
    setError(null);

    try {
      await apiCreateUser(requireToken(), payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "创建用户失败"));
      throw currentError;
    } finally {
      setCreating(false);
    }
  }

  async function updateUser(userId: number, payload: UserUpdatePayload): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiUpdateUser(requireToken(), userId, payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "更新用户失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function saveUserPermissionMatrix(
    userId: number,
    pages: PermissionMatrixPagesDTO,
  ): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      const pageCodes = matrixPages.map((page) => page.page_code);
      await apiUpdateUserPermissionMatrix(requireToken(), userId, pageCodes, pages);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "保存用户权限失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function deleteUser(userId: number): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiDeleteUser(requireToken(), userId);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "删除用户失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function resetPassword(userId: number): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await resetUserPassword(requireToken(), userId);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "重置密码失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  return {
    matrixPages,
    matrixRows,
    userDetailsById,
    loading,
    creating,
    mutating,
    error,
    reload: load,
    createUser,
    updateUser,
    saveUserPermissionMatrix,
    deleteUser,
    resetPassword,
    setError,
  };
}

export type AdminUsersPresenter = ReturnType<typeof useAdminUsersPresenter>;
