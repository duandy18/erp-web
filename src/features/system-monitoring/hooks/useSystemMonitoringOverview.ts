import { useCallback, useEffect, useState } from "react";

import { fetchSystemMonitoringOverview } from "../api/systemMonitoringApi";
import type { SystemMonitoringOverview } from "../contracts/systemMonitoring";

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "加载系统监控总览失败";
};

export function useSystemMonitoringOverview(token: string | null) {
  const [overview, setOverview] = useState<SystemMonitoringOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async (): Promise<void> => {
    if (!token) {
      setOverview(null);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemMonitoringOverview(token);
      setOverview(response);
    } catch (currentError) {
      setOverview(null);
      setError(toMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOverview();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadOverview]);

  return {
    overview,
    loading,
    error,
    reload: loadOverview,
  };
}
