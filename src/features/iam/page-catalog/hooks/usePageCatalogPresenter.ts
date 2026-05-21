import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAdminApps,
  syncAdminAppSelfDescription,
} from "../../../app-registry/admin-apps/api/adminAppsApi";
import type { AdminAppDTO } from "../../../app-registry/admin-apps/contracts/adminApps";
import { fetchAdminAppSelfDescription } from "../../../app-registry/api/appSelfDescriptionApi";
import type { AppSelfDescriptionDTO } from "../../../app-registry/contracts/selfDescription";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function usePageCatalogPresenter(token: string | null) {
  const [apps, setApps] = useState<AdminAppDTO[]>([]);
  const [requestedAppCode, setRequestedAppCode] = useState("");
  const [selfDescription, setSelfDescription] = useState<AppSelfDescriptionDTO | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectableApps = useMemo(
    () => apps.filter((app) => app.code !== "erp" && app.is_active),
    [apps],
  );

  const selectedAppCode = useMemo(() => {
    if (selectableApps.length === 0) {
      return "";
    }

    if (requestedAppCode && selectableApps.some((app) => app.code === requestedAppCode)) {
      return requestedAppCode;
    }

    return selectableApps[0]?.code ?? "";
  }, [requestedAppCode, selectableApps]);

  const selectedApp = useMemo(
    () => selectableApps.find((app) => app.code === selectedAppCode) ?? null,
    [selectableApps, selectedAppCode],
  );

  const loadApps = useCallback(async (): Promise<void> => {
    if (!token) {
      setApps([]);
      setSelfDescription(null);
      setError("缺少登录凭证");
      return;
    }

    setLoadingApps(true);
    setError(null);

    try {
      const response = await fetchAdminApps(token);
      setApps(Array.isArray(response.apps) ? response.apps : []);
    } catch (currentError) {
      setApps([]);
      setSelfDescription(null);
      setError(errorMessage(currentError, "加载独立系统列表失败"));
    } finally {
      setLoadingApps(false);
    }
  }, [token]);

  const loadPageCatalog = useCallback(
    async (appCode: string): Promise<void> => {
      if (!token) {
        setSelfDescription(null);
        setError("缺少登录凭证");
        return;
      }

      if (!appCode) {
        setSelfDescription(null);
        return;
      }

      setLoadingCatalog(true);
      setError(null);

      try {
        const response = await fetchAdminAppSelfDescription(token, appCode);
        setSelfDescription(response);
      } catch (currentError) {
        setSelfDescription(null);
        setError(errorMessage(currentError, "加载页面目录失败，请先在独立系统注册页执行同步"));
      } finally {
        setLoadingCatalog(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApps();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadApps]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageCatalog(selectedAppCode);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadPageCatalog, selectedAppCode]);

  const syncPageCatalog = useCallback(async (): Promise<void> => {
    if (!token) {
      setError("缺少登录凭证");
      return;
    }

    if (!selectedAppCode) {
      setError("请选择系统");
      return;
    }

    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      const result = await syncAdminAppSelfDescription(token, selectedAppCode);
      await loadPageCatalog(selectedAppCode);

      if (result.status === "success") {
        setSyncMessage(
          [
            "同步完成",
            `读取 ${result.fetched_count}`,
            `新增 ${result.inserted_count}`,
            `更新 ${result.updated_count}`,
            `删除 ${result.deleted_count}`,
          ].join("，"),
        );
      } else {
        setSyncMessage(result.error_message ?? result.raw_excerpt ?? "同步未成功");
      }
    } catch (currentError) {
      setSyncMessage(null);
      setError(errorMessage(currentError, "同步页面目录失败"));
    } finally {
      setSyncing(false);
    }
  }, [loadPageCatalog, selectedAppCode, token]);

  return {
    apps: selectableApps,
    selectedApp,
    selectedAppCode,
    setSelectedAppCode: setRequestedAppCode,
    selfDescription,
    loading: loadingApps || loadingCatalog,
    syncing,
    syncMessage,
    error,
    reloadApps: loadApps,
    reloadPageCatalog: () => loadPageCatalog(selectedAppCode),
    syncPageCatalog,
  };
}

export type PageCatalogPresenter = ReturnType<typeof usePageCatalogPresenter>;
