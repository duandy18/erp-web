import { useContext } from "react";

import { SessionRuntimeContext, type SessionRuntimeValue } from "./SessionRuntimeContext";

export function useSessionRuntime(): SessionRuntimeValue {
  const context = useContext(SessionRuntimeContext);

  if (!context) {
    throw new Error("useSessionRuntime must be used inside SessionRuntimeProvider");
  }

  return context;
}
