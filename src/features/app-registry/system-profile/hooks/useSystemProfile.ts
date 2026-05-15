import { useCallback, useEffect, useState } from "react";

import { fetchSystemProfile } from "../api/systemProfileApi";
import type { AppRegistrySystemProfile } from "../contracts/systemProfile";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useSystemProfile(token: string | null, appCode: string | undefined) {
  const [profile, setProfile] = useState<AppRegistrySystemProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setProfile(null);
      setError("缺少登录凭证");
      return;
    }

    if (!appCode) {
      setProfile(null);
      setError("缺少应用编码");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemProfile(token, appCode);
      setProfile(response);
    } catch (currentError) {
      setProfile(null);
      setError(errorMessage(currentError, "加载系统档案失败"));
    } finally {
      setLoading(false);
    }
  }, [appCode, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  return {
    profile,
    loading,
    error,
    reload: load,
  };
}
