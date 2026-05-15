import { apiRequest } from "../../../shared/api/httpClient";
import type { CurrentUser, TokenOut, UserLoginIn } from "../contracts/auth";
import type { MyNavigationOut } from "../contracts/navigation";

export function loginWithPassword(payload: UserLoginIn): Promise<TokenOut> {
  return apiRequest<TokenOut>("/users/login", {
    method: "POST",
    body: payload,
  });
}

export function fetchCurrentUser(token: string): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/users/me", {
    token,
  });
}

export function fetchMyNavigation(token: string): Promise<MyNavigationOut> {
  return apiRequest<MyNavigationOut>("/users/me/navigation", {
    token,
  });
}
