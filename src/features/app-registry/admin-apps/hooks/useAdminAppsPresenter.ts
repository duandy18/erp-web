import { useCallback, useEffect, useState } from "react";

import {
  approveRegistrationRequest as apiApproveRegistrationRequest,
  createRegistrationRequestFromManifest as apiCreateRegistrationRequestFromManifest,
  disableAdminApp as apiDisableAdminApp,
  enableAdminApp as apiEnableAdminApp,
  fetchAdminApps,
  fetchRegistrationRequests,
  rejectRegistrationRequest as apiRejectRegistrationRequest,
  syncAdminAppSelfDescription as apiSyncAdminAppSelfDescription,
  updateAdminApp as apiUpdateAdminApp,
} from "../api/adminAppsApi";
import type {
  AdminAppDTO,
  AdminAppRegistrationRequestCreatePayload,
  AdminAppRegistrationRequestDTO,
  AdminAppRegistrationReviewPayload,
  AdminAppSelfDescriptionSyncRunDTO,
  AdminAppUpdatePayload,
} from "../contracts/adminApps";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function useAdminAppsPresenter(token: string | null) {
  const [apps, setApps] = useState<AdminAppDTO[]>([]);
  const [registrationRequests, setRegistrationRequests] = useState<
    AdminAppRegistrationRequestDTO[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [loadingRegistrationRequests, setLoadingRegistrationRequests] = useState(false);
  const [submittingRegistrationRequest, setSubmittingRegistrationRequest] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [reviewingRequestId, setReviewingRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requireToken = useCallback((): string => {
    if (!token) {
      throw new Error("缺少登录凭证");
    }

    return token;
  }, [token]);

  const load = useCallback(async (): Promise<void> => {
    if (!token) {
      setApps([]);
      setError("缺少登录凭证");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchAdminApps(token);
      setApps(Array.isArray(response.apps) ? response.apps : []);
    } catch (currentError) {
      setApps([]);
      setError(errorMessage(currentError, "加载独立系统列表失败"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadRegistrationRequests = useCallback(async (): Promise<void> => {
    if (!token) {
      setRegistrationRequests([]);
      setError("缺少登录凭证");
      return;
    }

    setLoadingRegistrationRequests(true);
    setError(null);

    try {
      const response = await fetchRegistrationRequests(token);
      setRegistrationRequests(Array.isArray(response.requests) ? response.requests : []);
    } catch (currentError) {
      setRegistrationRequests([]);
      setError(errorMessage(currentError, "加载接入申请失败"));
    } finally {
      setLoadingRegistrationRequests(false);
    }
  }, [token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
      void loadRegistrationRequests();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load, loadRegistrationRequests]);

  async function createRegistrationRequestFromManifest(
    payload: AdminAppRegistrationRequestCreatePayload,
  ): Promise<AdminAppRegistrationRequestDTO> {
    setSubmittingRegistrationRequest(true);
    setError(null);

    try {
      const result = await apiCreateRegistrationRequestFromManifest(requireToken(), payload);
      await loadRegistrationRequests();
      return result;
    } catch (currentError) {
      setError(errorMessage(currentError, "生成接入申请失败"));
      throw currentError;
    } finally {
      setSubmittingRegistrationRequest(false);
    }
  }

  async function updateApp(code: string, payload: AdminAppUpdatePayload): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiUpdateAdminApp(requireToken(), code, payload);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "更新独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function syncSelfDescription(code: string): Promise<AdminAppSelfDescriptionSyncRunDTO> {
    setSyncingCode(code);
    setError(null);

    try {
      const result = await apiSyncAdminAppSelfDescription(requireToken(), code);
      await load();
      return result;
    } catch (currentError) {
      setError(errorMessage(currentError, "同步自描述失败"));
      throw currentError;
    } finally {
      setSyncingCode(null);
    }
  }

  async function approveRegistrationRequest(
    requestId: number,
    payload: AdminAppRegistrationReviewPayload,
  ): Promise<AdminAppRegistrationRequestDTO> {
    setReviewingRequestId(requestId);
    setError(null);

    try {
      const result = await apiApproveRegistrationRequest(requireToken(), requestId, payload);
      await loadRegistrationRequests();
      await load();
      return result;
    } catch (currentError) {
      setError(errorMessage(currentError, "批准接入申请失败"));
      throw currentError;
    } finally {
      setReviewingRequestId(null);
    }
  }

  async function rejectRegistrationRequest(
    requestId: number,
    payload: AdminAppRegistrationReviewPayload,
  ): Promise<AdminAppRegistrationRequestDTO> {
    setReviewingRequestId(requestId);
    setError(null);

    try {
      const result = await apiRejectRegistrationRequest(requireToken(), requestId, payload);
      await loadRegistrationRequests();
      return result;
    } catch (currentError) {
      setError(errorMessage(currentError, "拒绝接入申请失败"));
      throw currentError;
    } finally {
      setReviewingRequestId(null);
    }
  }

  async function enableApp(code: string): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiEnableAdminApp(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "启用独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  async function disableApp(code: string): Promise<void> {
    setMutating(true);
    setError(null);

    try {
      await apiDisableAdminApp(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "停用独立系统失败"));
      throw currentError;
    } finally {
      setMutating(false);
    }
  }

  return {
    apps,
    registrationRequests,
    loading,
    loadingRegistrationRequests,
    submittingRegistrationRequest,
    mutating,
    syncingCode,
    reviewingRequestId,
    error,
    reload: load,
    reloadRegistrationRequests: loadRegistrationRequests,
    createRegistrationRequestFromManifest,
    updateApp,
    syncSelfDescription,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    enableApp,
    disableApp,
    setError,
  };
}

export type AdminAppsPresenter = ReturnType<typeof useAdminAppsPresenter>;
