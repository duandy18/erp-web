import { useCallback, useEffect, useState } from "react";

import {
  approveRegistrationRequest as apiApproveRegistrationRequest,
  createRegistrationRequestFromManifest as apiCreateRegistrationRequestFromManifest,
  fetchAdminApps,
  fetchRegistrationRequests,
  hideAdminAppFromMyApps as apiHideAdminAppFromMyApps,
  rejectRegistrationRequest as apiRejectRegistrationRequest,
  showAdminAppInMyApps as apiShowAdminAppInMyApps,
  syncAdminAppSelfDescription as apiSyncAdminAppSelfDescription,
} from "../api/adminAppsApi";
import type {
  AdminAppDTO,
  AdminAppRegistrationRequestCreatePayload,
  AdminAppRegistrationRequestDTO,
  AdminAppRegistrationReviewPayload,
  AdminAppSelfDescriptionSyncRunDTO,
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
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [visibilityChangingCode, setVisibilityChangingCode] = useState<string | null>(null);
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
      setError(errorMessage(currentError, "加载已接入系统失败"));
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

  async function syncSelfDescription(code: string): Promise<AdminAppSelfDescriptionSyncRunDTO> {
    setSyncingCode(code);
    setError(null);

    try {
      const result = await apiSyncAdminAppSelfDescription(requireToken(), code);
      await load();
      return result;
    } catch (currentError) {
      setError(errorMessage(currentError, "同步失败"));
      throw currentError;
    } finally {
      setSyncingCode(null);
    }
  }

  async function showAppInMyApps(code: string): Promise<void> {
    setVisibilityChangingCode(code);
    setError(null);

    try {
      await apiShowAdminAppInMyApps(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "显示到我的应用失败"));
      throw currentError;
    } finally {
      setVisibilityChangingCode(null);
    }
  }

  async function hideAppFromMyApps(code: string): Promise<void> {
    setVisibilityChangingCode(code);
    setError(null);

    try {
      await apiHideAdminAppFromMyApps(requireToken(), code);
      await load();
    } catch (currentError) {
      setError(errorMessage(currentError, "不在我的应用中显示失败"));
      throw currentError;
    } finally {
      setVisibilityChangingCode(null);
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

  return {
    apps,
    registrationRequests,
    loading,
    loadingRegistrationRequests,
    submittingRegistrationRequest,
    syncingCode,
    visibilityChangingCode,
    reviewingRequestId,
    error,
    reload: load,
    reloadRegistrationRequests: loadRegistrationRequests,
    createRegistrationRequestFromManifest,
    syncSelfDescription,
    showAppInMyApps,
    hideAppFromMyApps,
    approveRegistrationRequest,
    rejectRegistrationRequest,
    setError,
  };
}

export type AdminAppsPresenter = ReturnType<typeof useAdminAppsPresenter>;
