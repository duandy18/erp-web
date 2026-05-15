import { useCallback, useEffect, useState } from "react";

import { fetchRegisteredApps } from "../api/appRegistryApi";
import type { RegisteredApp } from "../contracts/appRegistry";

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "加载应用注册信息失败";
};

export function useRegisteredApps(token: string | null) {
  const [apps, setApps] = useState<RegisteredApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadApps = useCallback(async (): Promise<void> => {
    if (!token) {
      setApps([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchRegisteredApps(token);
      setApps(response.apps);
    } catch (currentError) {
      setApps([]);
      setError(toMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApps();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadApps]);

  return {
    apps,
    loading,
    error,
    reload: loadApps,
  };
}
