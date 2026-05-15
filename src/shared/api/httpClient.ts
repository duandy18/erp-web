import { API_BASE_URL } from "../config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  method?: HttpMethod;
  token?: string | null;
  body?: unknown;
};

const buildApiUrl = (path: string): string => {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!base) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
};

const parseJsonSafely = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractErrorMessage = (responseText: string): string => {
  const parsed = parseJsonSafely(responseText);

  if (parsed && typeof parsed === "object" && "detail" in parsed) {
    const detail = (parsed as { detail?: unknown }).detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (detail !== undefined) {
      return JSON.stringify(detail);
    }
  }

  return responseText;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", token, body }: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const responseText = await response.text();

  if (!response.ok) {
    const message = extractErrorMessage(responseText) || `HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!responseText) {
    return undefined as T;
  }

  return parseJsonSafely(responseText) as T;
}
