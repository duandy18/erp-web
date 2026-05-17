import { useCallback, useEffect, useState } from "react";

import { fetchSystemMonitoringDatabases } from "../api/systemMonitoringApi";
import type { SystemMonitoringDatabaseStatus } from "../contracts/systemMonitoring";

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "加载数据库状态失败";
};

export function useSystemMonitoringDatabases(token: string | null, enabled: boolean) {
  const [databases, setDatabases] = useState<SystemMonitoringDatabaseStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatabases = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (!token) {
      setDatabases([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemMonitoringDatabases(token);
      setDatabases(Array.isArray(response.databases) ? response.databases : []);
    } catch (currentError) {
      setDatabases([]);
      setError(toMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDatabases();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDatabases]);

  return {
    databases,
    loading,
    error,
    reload: loadDatabases,
  };
}
