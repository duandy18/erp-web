import { useCallback, useEffect, useState } from "react";

import { fetchSystemServiceAuthContracts } from "../api/systemServiceAuthContractsApi";
import type { SystemServiceAuthContractDTO } from "../contracts/systemServiceAuthContracts";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useSystemServiceAuthContracts(token: string | null) {
  const [contracts, setContracts] = useState<SystemServiceAuthContractDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setContracts([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemServiceAuthContracts(token);
      setContracts(Array.isArray(response.contracts) ? response.contracts : []);
    } catch (currentError) {
      setContracts([]);
      setError(errorMessage(currentError, "加载合同目录失败"));
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
    contracts,
    loading,
    error,
    reload: load,
  };
}
