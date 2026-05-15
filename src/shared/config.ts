const normalizeBasePath = (value: string | undefined): string => {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") && withLeadingSlash.length > 1
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
};

const resolveRuntimeEntryLabel = (): string => {
  if (typeof window === "undefined") {
    return "runtime";
  }

  return window.location.host || window.location.origin || "runtime";
};

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH);
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
export const APP_RUNTIME_ENTRY_LABEL =
  import.meta.env.VITE_APP_RUNTIME_ENTRY_LABEL ?? resolveRuntimeEntryLabel();
