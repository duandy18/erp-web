import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applyAppIam,
  fetchAppIamPermissionMatrix,
  saveAppIamUserDesired,
  verifyAppIam,
} from "../api/appPermissionsApi";
import type {
  AppIamDesiredAppPayload,
  AppIamMatrixAppDTO,
  AppIamPermissionMatrixDTO,
  AppIamWriteRunDTO,
} from "../contracts/appPermissions";

type PermissionDraft = Record<string, Record<string, boolean>>;
type AccessDraft = Record<string, boolean>;
type RunningAction = "save" | "apply" | "verify" | null;

const EMPTY_MATRIX: AppIamPermissionMatrixDTO = {
  summary: {
    user_count: 0,
    app_count: 0,
    app_page_count: 0,
    access_count: 0,
    permission_count: 0,
    latest_apply_success_count: 0,
    latest_verify_success_count: 0,
  },
  users: [],
  apps: [],
  app_pages: [],
  user_app_access: [],
  user_app_permissions: [],
  write_status: {
    items: [],
    recent_runs: [],
  },
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function buildAccessDraft(matrix: AppIamPermissionMatrixDTO, userId: number | null): AccessDraft {
  if (userId === null) {
    return {};
  }

  const result: AccessDraft = {};
  for (const app of matrix.apps) {
    result[app.app_code] = false;
  }

  for (const access of matrix.user_app_access) {
    if (access.user_id === userId) {
      result[access.app_code] = Boolean(access.is_active);
    }
  }

  return result;
}

function buildPermissionDraft(
  matrix: AppIamPermissionMatrixDTO,
  userId: number | null,
): PermissionDraft {
  if (userId === null) {
    return {};
  }

  const result: PermissionDraft = {};
  for (const app of matrix.apps) {
    result[app.app_code] = {};
  }

  for (const permission of matrix.user_app_permissions) {
    if (permission.user_id === userId && permission.is_active) {
      result[permission.app_code] = {
        ...(result[permission.app_code] ?? {}),
        [permission.permission_code]: true,
      };
    }
  }

  return result;
}

function toUserDesiredPayload(
  apps: AppIamMatrixAppDTO[],
  accessDraft: AccessDraft,
  permissionDraft: PermissionDraft,
): { apps: AppIamDesiredAppPayload[] } {
  return {
    apps: apps.map((app) => {
      const appPermissions = permissionDraft[app.app_code] ?? {};
      const permissions = Object.entries(appPermissions)
        .filter(([, active]) => active)
        .map(([permissionCode]) => ({
          permission_code: permissionCode,
          is_active: true,
        }));

      return {
        app_code: app.app_code,
        is_active: Boolean(accessDraft[app.app_code]),
        permissions,
      };
    }),
  };
}

export function useAppPermissionsPresenter(token: string | null) {
  const [matrix, setMatrix] = useState<AppIamPermissionMatrixDTO>(EMPTY_MATRIX);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedAppCode, setSelectedAppCode] = useState("");
  const [accessDraft, setAccessDraft] = useState<AccessDraft>({});
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>({});
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const selectedUser = useMemo(
    () => matrix.users.find((user) => user.user_id === selectedUserId) ?? null,
    [matrix.users, selectedUserId],
  );

  const selectedApp = useMemo(
    () => matrix.apps.find((app) => app.app_code === selectedAppCode) ?? null,
    [matrix.apps, selectedAppCode],
  );

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setMatrix(EMPTY_MATRIX);
      setSelectedUserId(null);
      setSelectedAppCode("");
      setAccessDraft({});
      setPermissionDraft({});
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAppIamPermissionMatrix(token);
      setMatrix(response);

      const nextUserId = response.users.some((user) => user.user_id === selectedUserId)
        ? selectedUserId
        : response.users[0]?.user_id ?? null;
      const nextAppCode = response.apps.some((app) => app.app_code === selectedAppCode)
        ? selectedAppCode
        : response.apps[0]?.app_code ?? "";

      setSelectedUserId(nextUserId);
      setSelectedAppCode(nextAppCode);
      setAccessDraft(buildAccessDraft(response, nextUserId));
      setPermissionDraft(buildPermissionDraft(response, nextUserId));
    } catch (currentError) {
      setMatrix(EMPTY_MATRIX);
      setError(errorMessage(currentError, "加载应用权限矩阵失败"));
    } finally {
      setLoading(false);
    }
  }, [selectedAppCode, selectedUserId, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  function selectUser(userId: number): void {
    setSelectedUserId(userId);
    setAccessDraft(buildAccessDraft(matrix, userId));
    setPermissionDraft(buildPermissionDraft(matrix, userId));
  }

  function setAppAccess(appCode: string, active: boolean): void {
    setAccessDraft((prev) => ({
      ...prev,
      [appCode]: active,
    }));
  }

  function setPermission(appCode: string, permissionCode: string, active: boolean): void {
    setPermissionDraft((prev) => ({
      ...prev,
      [appCode]: {
        ...(prev[appCode] ?? {}),
        [permissionCode]: active,
      },
    }));
  }

  function setWritePermission(
    appCode: string,
    readPermissionCode: string | null,
    writePermissionCode: string,
    active: boolean,
  ): void {
    setPermissionDraft((prev) => ({
      ...prev,
      [appCode]: {
        ...(prev[appCode] ?? {}),
        ...(readPermissionCode && active ? { [readPermissionCode]: true } : {}),
        [writePermissionCode]: active,
      },
    }));
  }

  async function saveSelectedUser(): Promise<void> {
    if (selectedUserId === null) {
      setError("请选择用户");
      return;
    }

    setRunningAction("save");
    setError(null);
    setMessage(null);

    try {
      const response = await saveAppIamUserDesired(
        requireToken(),
        selectedUserId,
        toUserDesiredPayload(matrix.apps, accessDraft, permissionDraft),
      );
      setMatrix(response);
      setAccessDraft(buildAccessDraft(response, selectedUserId));
      setPermissionDraft(buildPermissionDraft(response, selectedUserId));
      setMessage("应用权限配置已保存，尚未下发到目标系统。");
    } catch (currentError) {
      setError(errorMessage(currentError, "保存应用权限配置失败"));
      throw currentError;
    } finally {
      setRunningAction(null);
    }
  }

  async function applySelectedApp(): Promise<AppIamWriteRunDTO | null> {
    if (!selectedAppCode) {
      setError("请选择应用");
      return null;
    }

    setRunningAction("apply");
    setError(null);
    setMessage(null);

    try {
      const run = await applyAppIam(requireToken(), selectedAppCode);
      await load();
      setMessage(`${selectedAppCode} 下发完成：${run.status}`);
      return run;
    } catch (currentError) {
      setError(errorMessage(currentError, "下发到应用失败"));
      throw currentError;
    } finally {
      setRunningAction(null);
    }
  }

  async function verifySelectedApp(): Promise<AppIamWriteRunDTO | null> {
    if (!selectedAppCode) {
      setError("请选择应用");
      return null;
    }

    setRunningAction("verify");
    setError(null);
    setMessage(null);

    try {
      const run = await verifyAppIam(requireToken(), selectedAppCode);
      await load();
      setMessage(`${selectedAppCode} 验证完成：${run.status}`);
      return run;
    } catch (currentError) {
      setError(errorMessage(currentError, "验证应用失败"));
      throw currentError;
    } finally {
      setRunningAction(null);
    }
  }

  return {
    accessDraft,
    error,
    loading,
    matrix,
    message,
    permissionDraft,
    runningAction,
    selectedApp,
    selectedAppCode,
    selectedUser,
    selectedUserId,
    setAppAccess,
    setError,
    setMessage,
    setPermission,
    setSelectedAppCode,
    setWritePermission,
    reload: load,
    selectUser,
    saveSelectedUser,
    applySelectedApp,
    verifySelectedApp,
  };
}

export type AppPermissionsPresenter = ReturnType<typeof useAppPermissionsPresenter>;
