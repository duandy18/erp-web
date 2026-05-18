import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchSystemServiceAuthCapabilities } from "../api/systemServiceAuthApi";
import type { SystemServiceAuthCapabilityDTO } from "../contracts/systemServiceAuth";

type TargetAppOption = {
  code: string;
  name: string;
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function normalizeTargetAppCode(value: string): string {
  return value.trim();
}

function buildTargetOptions(capabilities: SystemServiceAuthCapabilityDTO[]): TargetAppOption[] {
  const map = new Map<string, string>();

  for (const capability of capabilities) {
    map.set(capability.target_app_code, capability.target_app_name);
  }

  return Array.from(map.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

export function useSystemServiceAuthCapabilities(token: string | null) {
  const [allCapabilities, setAllCapabilities] = useState<SystemServiceAuthCapabilityDTO[]>([]);
  const [capabilities, setCapabilities] = useState<SystemServiceAuthCapabilityDTO[]>([]);
  const [targetAppCode, setTargetAppCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setAllCapabilities([]);
      setCapabilities([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const allResponse = await fetchSystemServiceAuthCapabilities(token);
      const nextAllCapabilities = Array.isArray(allResponse.capabilities)
        ? allResponse.capabilities
        : [];

      setAllCapabilities(nextAllCapabilities);

      const normalizedTargetAppCode = normalizeTargetAppCode(targetAppCode);
      if (!normalizedTargetAppCode) {
        setCapabilities(nextAllCapabilities);
        return;
      }

      const filteredResponse = await fetchSystemServiceAuthCapabilities(token, {
        targetAppCode: normalizedTargetAppCode,
      });

      setCapabilities(
        Array.isArray(filteredResponse.capabilities) ? filteredResponse.capabilities : [],
      );
    } catch (currentError) {
      setAllCapabilities([]);
      setCapabilities([]);
      setError(errorMessage(currentError, "加载能力目录失败"));
    } finally {
      setLoading(false);
    }
  }, [targetAppCode, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const targetOptions = useMemo(() => buildTargetOptions(allCapabilities), [allCapabilities]);

  return {
    capabilities,
    targetOptions,
    targetAppCode,
    setTargetAppCode,
    loading,
    error,
    reload: load,
  };
}
