import { useCallback, useEffect, useState } from "react";

import { fetchSystemMonitoringEndpoints } from "../api/systemMonitoringApi";
import type { SystemMonitoringEndpointStatus } from "../contracts/systemMonitoring";

const toMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "加载 API 状态失败";
};

export function useSystemMonitoringEndpoints(token: string | null, enabled: boolean) {
  const [endpoints, setEndpoints] = useState<SystemMonitoringEndpointStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEndpoints = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (!token) {
      setEndpoints([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemMonitoringEndpoints(token);
      setEndpoints(Array.isArray(response.endpoints) ? response.endpoints : []);
    } catch (currentError) {
      setEndpoints([]);
      setError(toMessage(currentError));
    } finally {
      setLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadEndpoints();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadEndpoints]);

  return {
    endpoints,
    loading,
    error,
    reload: loadEndpoints,
  };
}
