import { useCallback, useEffect, useState } from "react";

import { fetchSystemServiceAuthWriteStatus } from "../api/systemServiceAuthApi";
import type {
  SystemServiceAuthWriteRunDTO,
  SystemServiceAuthWriteStatusItemDTO,
} from "../contracts/systemServiceAuth";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useSystemServiceAuthWriteStatus(token: string | null) {
  const [items, setItems] = useState<SystemServiceAuthWriteStatusItemDTO[]>([]);
  const [recentRuns, setRecentRuns] = useState<SystemServiceAuthWriteRunDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setItems([]);
      setRecentRuns([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemServiceAuthWriteStatus(token);
      setItems(Array.isArray(response.items) ? response.items : []);
      setRecentRuns(Array.isArray(response.recent_runs) ? response.recent_runs : []);
    } catch (currentError) {
      setItems([]);
      setRecentRuns([]);
      setError(errorMessage(currentError, "加载写入状态失败"));
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

  return {
    items,
    recentRuns,
    loading,
    error,
    reload: load,
  };
}
