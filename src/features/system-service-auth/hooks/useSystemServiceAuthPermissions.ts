import { useCallback, useEffect, useState } from "react";

import {
  applySystemServiceAuthPermission,
  createSystemServiceAuthPermission,
  fetchSystemServiceAuthPermissions,
  updateSystemServiceAuthPermission,
  verifySystemServiceAuthPermission,
} from "../api/systemServiceAuthApi";
import type {
  SystemServiceAuthCapabilityOptionDTO,
  SystemServiceAuthClientDTO,
  SystemServiceAuthPermissionCreatePayload,
  SystemServiceAuthPermissionDTO,
  SystemServiceAuthPermissionUpdatePayload,
  SystemServiceAuthWriteRunDTO,
} from "../contracts/systemServiceAuth";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useSystemServiceAuthPermissions(token: string | null) {
  const [clients, setClients] = useState<SystemServiceAuthClientDTO[]>([]);
  const [capabilityOptions, setCapabilityOptions] = useState<
    SystemServiceAuthCapabilityOptionDTO[]
  >([]);
  const [permissions, setPermissions] = useState<SystemServiceAuthPermissionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setClients([]);
      setCapabilityOptions([]);
      setPermissions([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchSystemServiceAuthPermissions(token);
      setClients(Array.isArray(response.clients) ? response.clients : []);
      setCapabilityOptions(
        Array.isArray(response.capability_options) ? response.capability_options : [],
      );
      setPermissions(Array.isArray(response.permissions) ? response.permissions : []);
    } catch (currentError) {
      setClients([]);
      setCapabilityOptions([]);
      setPermissions([]);
      setError(errorMessage(currentError, "加载调用授权失败"));
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

  async function createPermission(payload: SystemServiceAuthPermissionCreatePayload): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await createSystemServiceAuthPermission(requireToken(), payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "创建调用授权失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function updatePermission(
    permissionId: number,
    payload: SystemServiceAuthPermissionUpdatePayload,
  ): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await updateSystemServiceAuthPermission(requireToken(), permissionId, payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "更新调用授权失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function applyPermission(permissionId: number): Promise<SystemServiceAuthWriteRunDTO> {
    setMutating(true);
    setError(null);

    try {
      const run = await applySystemServiceAuthPermission(requireToken(), permissionId);
      await load();
      return run;
    } catch (currentError) {
      setError(errorMessage(currentError, "写入目标系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function verifyPermission(permissionId: number): Promise<SystemServiceAuthWriteRunDTO> {
    setMutating(true);
    setError(null);

    try {
      const run = await verifySystemServiceAuthPermission(requireToken(), permissionId);
      await load();
      return run;
    } catch (currentError) {
      setError(errorMessage(currentError, "读回校验失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  return {
    clients,
    capabilityOptions,
    permissions,
    loading,
    mutating,
    error,
    reload: load,
    createPermission,
    updatePermission,
    applyPermission,
    verifyPermission,
    setError,
  };
}
