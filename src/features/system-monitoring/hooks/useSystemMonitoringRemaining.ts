import { useCallback, useEffect, useState } from "react";

import {
  fetchSystemMonitoringDependencies,
  fetchSystemMonitoringGateway,
  fetchSystemMonitoringHealth,
  fetchSystemMonitoringOpenApi,
  fetchSystemMonitoringServiceAuth,
} from "../api/systemMonitoringApi";
import type {
  SystemMonitoringDependenciesResponse,
  SystemMonitoringDependency,
  SystemMonitoringGatewayBinding,
  SystemMonitoringGatewayResponse,
  SystemMonitoringHealthCheck,
  SystemMonitoringHealthResponse,
  SystemMonitoringOpenApiResponse,
  SystemMonitoringOpenApiSource,
  SystemMonitoringServiceAuthResponse,
} from "../contracts/systemMonitoring";

type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const EMPTY_GATEWAY_BINDINGS: SystemMonitoringGatewayBinding[] = [];
const EMPTY_DEPENDENCIES: SystemMonitoringDependency[] = [];
const EMPTY_SERVICE_AUTH: SystemMonitoringServiceAuthResponse = {
  clients: [],
  permissions: [],
};
const EMPTY_OPENAPI_SOURCES: SystemMonitoringOpenApiSource[] = [];
const EMPTY_HEALTH_CHECKS: SystemMonitoringHealthCheck[] = [];

const selectGateway = (response: SystemMonitoringGatewayResponse) =>
  Array.isArray(response.gateway_bindings) ? response.gateway_bindings : [];

const selectDependencies = (response: SystemMonitoringDependenciesResponse) =>
  Array.isArray(response.dependencies) ? response.dependencies : [];

const selectServiceAuth = (response: SystemMonitoringServiceAuthResponse) => ({
  clients: Array.isArray(response.clients) ? response.clients : [],
  permissions: Array.isArray(response.permissions) ? response.permissions : [],
});

const selectOpenApi = (response: SystemMonitoringOpenApiResponse) =>
  Array.isArray(response.openapi_sources) ? response.openapi_sources : [];

const selectHealth = (response: SystemMonitoringHealthResponse) =>
  Array.isArray(response.health_checks) ? response.health_checks : [];

const toMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

function useSystemMonitoringResource<TResponse, TData>({
  token,
  enabled,
  fetcher,
  selector,
  emptyData,
  errorMessage,
}: {
  token: string | null;
  enabled: boolean;
  fetcher: (token: string) => Promise<TResponse>;
  selector: (response: TResponse) => TData;
  emptyData: TData;
  errorMessage: string;
}): ResourceState<TData> {
  const [data, setData] = useState<TData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResource = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    if (!token) {
      setData(emptyData);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetcher(token);
      setData(selector(response));
    } catch (currentError) {
      setData(emptyData);
      setError(toMessage(currentError, errorMessage));
    } finally {
      setLoading(false);
    }
  }, [emptyData, enabled, errorMessage, fetcher, selector, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadResource();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadResource]);

  return {
    data,
    loading,
    error,
    reload: loadResource,
  };
}

export function useSystemMonitoringGateway(token: string | null, enabled: boolean) {
  return useSystemMonitoringResource({
    token,
    enabled,
    fetcher: fetchSystemMonitoringGateway,
    selector: selectGateway,
    emptyData: EMPTY_GATEWAY_BINDINGS,
    errorMessage: "加载 Gateway 状态失败",
  });
}

export function useSystemMonitoringDependencies(token: string | null, enabled: boolean) {
  return useSystemMonitoringResource({
    token,
    enabled,
    fetcher: fetchSystemMonitoringDependencies,
    selector: selectDependencies,
    emptyData: EMPTY_DEPENDENCIES,
    errorMessage: "加载系统依赖状态失败",
  });
}

export function useSystemMonitoringServiceAuth(token: string | null, enabled: boolean) {
  return useSystemMonitoringResource({
    token,
    enabled,
    fetcher: fetchSystemMonitoringServiceAuth,
    selector: selectServiceAuth,
    emptyData: EMPTY_SERVICE_AUTH,
    errorMessage: "加载 Service Auth 状态失败",
  });
}

export function useSystemMonitoringOpenApi(token: string | null, enabled: boolean) {
  return useSystemMonitoringResource({
    token,
    enabled,
    fetcher: fetchSystemMonitoringOpenApi,
    selector: selectOpenApi,
    emptyData: EMPTY_OPENAPI_SOURCES,
    errorMessage: "加载 OpenAPI 合同状态失败",
  });
}

export function useSystemMonitoringHealth(token: string | null, enabled: boolean) {
  return useSystemMonitoringResource({
    token,
    enabled,
    fetcher: fetchSystemMonitoringHealth,
    selector: selectHealth,
    emptyData: EMPTY_HEALTH_CHECKS,
    errorMessage: "加载健康检查状态失败",
  });
}
