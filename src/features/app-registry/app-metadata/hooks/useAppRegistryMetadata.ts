import { useCallback, useEffect, useState } from "react";

import { fetchAppRegistryMetadataProfiles } from "../api/appMetadataApi";
import type { AppRegistryMetadataProfile } from "../contracts/appMetadata";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useAppRegistryMetadata(token: string | null) {
  const [profiles, setProfiles] = useState<AppRegistryMetadataProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setProfiles([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAppRegistryMetadataProfiles(token);
      setProfiles(Array.isArray(response.profiles) ? response.profiles : []);
    } catch (currentError) {
      setProfiles([]);
      setError(errorMessage(currentError, "加载应用主档信息失败"));
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
    profiles,
    loading,
    error,
    reload: load,
  };
}
