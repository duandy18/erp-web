import { useCallback, useEffect, useState } from "react";

import {
  fetchIndependentSystemUserPermissions,
  syncIndependentSystemIamSnapshot,
} from "../api/systemIamApi";
import type {
  IndependentSystemUserPermissionsResponse,
  SystemIamSyncRunDTO,
} from "../contracts/systemIam";

const EMPTY_RESPONSE: IndependentSystemUserPermissionsResponse = {
  apps: [],
  users: [],
  permissions: [],
  user_permissions: [],
  page_registry: [],
  page_route_prefixes: [],
  latest_sync_runs: [],
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useIndependentSystemUserPermissions(token: string | null) {
  const [data, setData] = useState<IndependentSystemUserPermissionsResponse>(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(false);
  const [syncingAppCode, setSyncingAppCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [latestManualRun, setLatestManualRun] = useState<SystemIamSyncRunDTO | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setData(EMPTY_RESPONSE);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchIndependentSystemUserPermissions(token);
      setData({
        apps: Array.isArray(response.apps) ? response.apps : [],
        users: Array.isArray(response.users) ? response.users : [],
        permissions: Array.isArray(response.permissions) ? response.permissions : [],
        user_permissions: Array.isArray(response.user_permissions)
          ? response.user_permissions
          : [],
        page_registry: Array.isArray(response.page_registry) ? response.page_registry : [],
        page_route_prefixes: Array.isArray(response.page_route_prefixes)
          ? response.page_route_prefixes
          : [],
        latest_sync_runs: Array.isArray(response.latest_sync_runs)
          ? response.latest_sync_runs
          : [],
      });
    } catch (currentError) {
      setData(EMPTY_RESPONSE);
      setError(errorMessage(currentError, "加载独立系统用户权限表失败"));
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

  async function syncApp(appCode: string): Promise<void> {
    const normalizedAppCode = appCode.trim();
    if (!normalizedAppCode) {
      setError("请选择要同步的系统");
      return;
    }

    setSyncingAppCode(normalizedAppCode);
    setError(null);
    setMessage(null);

    try {
      const run = await syncIndependentSystemIamSnapshot(requireToken(), normalizedAppCode);
      setLatestManualRun(run);
      setMessage(
        `${normalizedAppCode} IAM 快照同步成功：拉取 ${run.fetched_count} 条，新增 ${run.inserted_count} 条，更新 ${run.updated_count} 条，删除 ${run.deleted_count} 条。`,
      );
      await load();
    } catch (currentError) {
      setLatestManualRun(null);
      setError(errorMessage(currentError, "同步独立系统 IAM 快照失败"));
      throw currentError;
    } finally {
      setSyncingAppCode(null);
    }
  }

  return {
    data,
    loading,
    syncingAppCode,
    error,
    message,
    latestManualRun,
    reload: load,
    syncApp,
    setError,
    setMessage,
  };
}

export type IndependentSystemUserPermissionsPresenter = ReturnType<
  typeof useIndependentSystemUserPermissions
>;
