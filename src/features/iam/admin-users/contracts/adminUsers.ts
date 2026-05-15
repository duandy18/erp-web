export type UserDTO = {
  id: number;
  username: string;
  is_active: boolean;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  permissions: string[];
};

export type PermissionMatrixCellDTO = {
  read: boolean;
  write: boolean;
};

export type PermissionMatrixPagesDTO = Record<string, PermissionMatrixCellDTO>;

export type PermissionMatrixPageDTO = {
  page_code: string;
  page_name: string;
  sort_order: number;
};

export type PermissionMatrixRowDTO = {
  user_id: number;
  username: string;
  full_name: string | null;
  is_active: boolean;
  pages: PermissionMatrixPagesDTO;
};

export type UserPermissionMatrixRawDTO = {
  pages: PermissionMatrixPageDTO[];
  users: PermissionMatrixRowDTO[];
};

export type UserPermissionMatrixDTO = {
  pages: PermissionMatrixPageDTO[];
  rows: PermissionMatrixRowDTO[];
};

export type UserCreatePayload = {
  username: string;
  password: string;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type UserUpdatePayload = {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
};
