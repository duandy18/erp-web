import { useCallback, useEffect, useState } from "react";

import {
  createAdminApp as apiCreateAdminApp,
  disableAdminApp as apiDisableAdminApp,
  enableAdminApp as apiEnableAdminApp,
  fetchAdminApps,
  syncAdminAppSelfDescription as apiSyncAdminAppSelfDescription,
  updateAdminApp as apiUpdateAdminApp,
} from "../api/adminAppsApi";
import type {
  AdminAppCreatePayload,
  AdminAppDTO,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppUpdatePayload,
} from "../contracts/adminApps";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useAdminAppsPresenter(token: string | null) {
  const [apps, setApps] = useState<AdminAppDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setApps([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAdminApps(token);
      setApps(Array.isArray(response.apps) ? response.apps : []);
    } catch (currentError) {
      setApps([]);
      setError(errorMessage(currentError, "加载独立系统列表失败"));
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

  async function createApp(payload: AdminAppCreatePayload): Promise<void> {
    setCreating(true);
    setError(null);

    try {
      await apiCreateAdminApp(requireToken(), payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "创建独立系统失败"));
      throw currentError;
    } finally {
      setCreating(false);
    }
  }

  async function updateApp(code: string, payload: AdminAppUpdatePayload): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiUpdateAdminApp(requireToken(), code, payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "更新独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function syncSelfDescription(code: string): Promise<AdminAppSelfDescriptionSyncRunDTO> {
    setSyncingCode(code);

    try {
      const result = await apiSyncAdminAppSelfDescription(requireToken(), code);
      await load();
      return result;
    } finally {
      setSyncingCode(null);
    }
  }

  async function enableApp(code: string): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiEnableAdminApp(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "启用独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function disableApp(code: string): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiDisableAdminApp(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "停用独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  return {
    apps,
    loading,
    creating,
    mutating,
    syncingCode,
    error,
    reload: load,
    createApp,
    updateApp,
    syncSelfDescription,
    enableApp,
    disableApp,
    setError,
  };
}

export type AdminAppsPresenter = ReturnType<typeof useAdminAppsPresenter>;
