import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminApps } from "../../../app-registry/admin-apps/api/adminAppsApi";
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

  return {
    apps: selectableApps,
    selectedApp,
    selectedAppCode,
    setSelectedAppCode: setRequestedAppCode,
    selfDescription,
    loading: loadingApps || loadingCatalog,
    error,
    reloadApps: loadApps,
    reloadPageCatalog: () => loadPageCatalog(selectedAppCode),
  };
}

export type PageCatalogPresenter = ReturnType<typeof usePageCatalogPresenter>;
