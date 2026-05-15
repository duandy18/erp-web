import { createContext } from "react";

import type { CurrentUser } from "../contracts/auth";
import type { MyNavigationOut } from "../contracts/navigation";

export type SessionRuntimeStatus = "initializing" | "authenticated" | "anonymous";

export type SessionRuntimeValue = {
  status: SessionRuntimeStatus;
  token: string | null;
  user: CurrentUser | null;
  navigation: MyNavigationOut | null;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export const SessionRuntimeContext = createContext<SessionRuntimeValue | null>(null);
