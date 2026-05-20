import { apiRequest } from "../../../shared/api/httpClient";
import type { SystemServiceAuthContractCatalogResponse } from "../contracts/systemServiceAuthContracts";

export function fetchSystemServiceAuthContracts(
  token: string,
): Promise<SystemServiceAuthContractCatalogResponse> {
  return apiRequest<SystemServiceAuthContractCatalogResponse>(
    "/admin/system-service-auth/contracts",
    {
      token,
    },
  );
}
