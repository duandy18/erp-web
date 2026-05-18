import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchAdminApps } from "../admin-apps/api/adminAppsApi";
import type { AdminAppDTO } from "../admin-apps/contracts/adminApps";
import { fetchAdminAppSelfDescription } from "../api/appSelfDescriptionApi";
import type { AppSelfDescriptionDTO } from "../contracts/selfDescription";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useAppSelfDescriptionCatalog(token: string | null) {
  const [apps, setApps] = useState<AdminAppDTO[]>([]);
  const [requestedAppCode, setRequestedAppCode] = useState<string>("");
  const [selfDescription, setSelfDescription] = useState<AppSelfDescriptionDTO | null>(null);
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableApps = useMemo(
    () => apps.filter((app) => app.code !== "erp" && app.is_active),
    [apps],
  );

  const selectedAppCode = useMemo(() => {
    if (selectableApps.length === 0) {
      return "";
    }

    const requestedStillExists = selectableApps.some((app) => app.code === requestedAppCode);
    if (requestedAppCode && requestedStillExists) {
      return requestedAppCode;
    }

    return selectableApps[0].code;
  }, [requestedAppCode, selectableApps]);

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

  const loadSelfDescription = useCallback(
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

      setLoadingDescription(true);
      setError(null);

      try {
        const response = await fetchAdminAppSelfDescription(token, appCode);
        setSelfDescription(response);
      } catch (currentError) {
        setSelfDescription(null);
        setError(errorMessage(currentError, "加载前端页面目录失败，请先同步该系统自描述"));
      } finally {
        setLoadingDescription(false);
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
      void loadSelfDescription(selectedAppCode);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSelfDescription, selectedAppCode]);

  return {
    apps: selectableApps,
    selectedAppCode,
    setSelectedAppCode: setRequestedAppCode,
    selfDescription,
    loading: loadingApps || loadingDescription,
    error,
    reloadApps: loadApps,
    reloadSelfDescription: () => loadSelfDescription(selectedAppCode),
  };
}
