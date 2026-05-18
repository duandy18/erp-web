import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { normalizeNavigationResponse } from "../../../shared/navigation/sidebarNavigation";
import { fetchCurrentUser, fetchMyNavigation, loginWithPassword } from "../api/sessionApi";
import type { CurrentUser } from "../contracts/auth";
import type { MyNavigationOut } from "../contracts/navigation";
import { clearAccessToken, readAccessToken, writeAccessToken } from "./sessionStorage";
import { SessionRuntimeContext, type SessionRuntimeStatus } from "./SessionRuntimeContext";

type SessionRuntimeProviderProps = {
  children: ReactNode;
};

const SHOULD_RESTORE_STORED_SESSION = !import.meta.env.DEV;

const toMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "请求失败";
};

const readInitialAccessToken = (): string | null => {
  if (!SHOULD_RESTORE_STORED_SESSION) {
    clearAccessToken();
    return null;
  }

  return readAccessToken();
};

export function SessionRuntimeProvider({ children }: SessionRuntimeProviderProps) {
  const [initialAccessToken] = useState<string | null>(() => readInitialAccessToken());
  const [status, setStatus] = useState<SessionRuntimeStatus>(() =>
    initialAccessToken ? "initializing" : "anonymous",
  );
  const [token, setToken] = useState<string | null>(() => initialAccessToken);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [navigation, setNavigation] = useState<MyNavigationOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyAnonymousSession = useCallback((message: string | null = null): void => {
    clearAccessToken();
    setToken(null);
    setUser(null);
    setNavigation(null);
    setError(message);
    setStatus("anonymous");
  }, []);

  const applyAuthenticatedSession = useCallback(
    (accessToken: string, nextUser: CurrentUser, nextNavigation: MyNavigationOut): void => {
      setToken(accessToken);
      setUser(nextUser);
      setNavigation(nextNavigation);
      setError(null);
      setStatus("authenticated");
    },
    [],
  );

  const loadSession = useCallback(
    async (accessToken: string): Promise<void> => {
      const [nextUser, rawNavigation] = await Promise.all([
        fetchCurrentUser(accessToken),
        fetchMyNavigation(accessToken),
      ]);

      applyAuthenticatedSession(
        accessToken,
        nextUser,
        normalizeNavigationResponse(rawNavigation),
      );
    },
    [applyAuthenticatedSession],
  );

  const logout = useCallback(() => {
    applyAnonymousSession();
  }, [applyAnonymousSession]);

  const refresh = useCallback(async (): Promise<void> => {
    const storedToken = readAccessToken();

    if (!storedToken) {
      applyAnonymousSession();
      return;
    }

    setStatus("initializing");

    try {
      await loadSession(storedToken);
    } catch (currentError) {
      applyAnonymousSession(toMessage(currentError));
    }
  }, [applyAnonymousSession, loadSession]);

  const login = useCallback(
    async (username: string, password: string): Promise<void> => {
      setStatus("initializing");
      setError(null);

      try {
        const tokenOut = await loginWithPassword({ username, password });
        writeAccessToken(tokenOut.access_token);
        await loadSession(tokenOut.access_token);
      } catch (currentError) {
        applyAnonymousSession(toMessage(currentError));
        throw currentError;
      }
    },
    [applyAnonymousSession, loadSession],
  );

  useEffect(() => {
    if (!SHOULD_RESTORE_STORED_SESSION) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      status,
      token,
      user,
      navigation,
      error,
      login,
      logout,
      refresh,
    }),
    [error, login, logout, navigation, refresh, status, token, user],
  );

  return <SessionRuntimeContext.Provider value={value}>{children}</SessionRuntimeContext.Provider>;
}
