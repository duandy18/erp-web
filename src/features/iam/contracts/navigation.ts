export type NavigationPage = {
  code: string;
  name: string;
  parent_code: string | null;
  level: number;
  domain_code: string;
  show_in_topbar: boolean;
  show_in_sidebar: boolean;
  sort_order: number;
  is_active: boolean;
  inherit_permissions: boolean;
  effective_read_permission: string | null;
  effective_write_permission: string | null;
  children: NavigationPage[];
};

export type NavigationRoutePrefix = {
  route_prefix: string;
  page_code: string;
  sort_order: number;
  is_active: boolean;
  effective_read_permission: string | null;
  effective_write_permission: string | null;
};

export type MyNavigationOut = {
  pages: NavigationPage[];
  route_prefixes: NavigationRoutePrefix[];
};
