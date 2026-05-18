import type {
  MyNavigationOut,
  NavigationPage,
  NavigationRoutePrefix,
} from "../../features/iam/contracts/navigation";

export type PageIndex = Record<string, NavigationPage>;

export type ResolvedPage = {
  pageCode: string;
  pageName: string;
  parentCode: string | null;
  parentName: string | null;
  level: number;
  domainCode: string;
  matchedRoutePrefix: string;
  effectiveReadPermission: string | null;
  effectiveWritePermission: string | null;
  showInTopbar: boolean;
  showInSidebar: boolean;
};

export type SidebarNode = {
  code: string;
  name: string;
  path: string | null;
  level: number;
  children: SidebarNode[];
};

export type SidebarSection = {
  code: string;
  name: string;
  path: string | null;
  nodes: SidebarNode[];
};

export type NavigationBreadcrumbItem = {
  code: string;
  name: string;
  path: string | null;
  level: number;
};


type RoutePrefixRule = {
  routePrefix: string;
  pageCode: string;
  sortOrder: number;
  effectiveReadPermission: string | null;
  effectiveWritePermission: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function pickNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function pickBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function splitPath(path: string): string[] {
  const normalized = normalizePath(path);
  if (normalized === "/") return [];
  return normalized.split("/").filter(Boolean);
}

export function isStaticRoutePrefix(path: string): boolean {
  return splitPath(path).every((segment) => !segment.startsWith(":"));
}

export function normalizeNavigationPage(raw: unknown): NavigationPage | null {
  if (!isRecord(raw)) return null;

  const code = pickString(raw.code).trim();
  const name = pickString(raw.name).trim();

  if (!code || !name) return null;

  const rawChildren = Array.isArray(raw.children) ? raw.children : [];
  const children = rawChildren
    .map((child) => normalizeNavigationPage(child))
    .filter((child): child is NavigationPage => child !== null);

  return {
    code,
    name,
    parent_code: pickNullableString(raw.parent_code),
    level: pickNumber(raw.level, 0),
    domain_code: pickString(raw.domain_code),
    show_in_topbar: pickBoolean(raw.show_in_topbar, false),
    show_in_sidebar: pickBoolean(raw.show_in_sidebar, false),
    sort_order: pickNumber(raw.sort_order, 0),
    is_active: pickBoolean(raw.is_active, false),
    inherit_permissions: pickBoolean(raw.inherit_permissions, false),
    effective_read_permission: pickNullableString(raw.effective_read_permission),
    effective_write_permission: pickNullableString(raw.effective_write_permission),
    children,
  };
}

export function normalizeNavigationRoutePrefix(raw: unknown): NavigationRoutePrefix | null {
  if (!isRecord(raw)) return null;

  const routePrefix = pickString(raw.route_prefix).trim();
  const pageCode = pickString(raw.page_code).trim();

  if (!routePrefix || !pageCode) return null;

  return {
    route_prefix: routePrefix,
    page_code: pageCode,
    sort_order: pickNumber(raw.sort_order, 0),
    is_active: pickBoolean(raw.is_active, false),
    effective_read_permission: pickNullableString(raw.effective_read_permission),
    effective_write_permission: pickNullableString(raw.effective_write_permission),
  };
}

export function normalizeNavigationResponse(raw: unknown): MyNavigationOut {
  if (!isRecord(raw)) {
    return { pages: [], route_prefixes: [] };
  }

  const rawPages = Array.isArray(raw.pages) ? raw.pages : [];
  const rawRoutePrefixes = Array.isArray(raw.route_prefixes) ? raw.route_prefixes : [];

  const pages = rawPages
    .map((page) => normalizeNavigationPage(page))
    .filter((page): page is NavigationPage => page !== null);

  const route_prefixes = rawRoutePrefixes
    .map((routePrefix) => normalizeNavigationRoutePrefix(routePrefix))
    .filter((routePrefix): routePrefix is NavigationRoutePrefix => routePrefix !== null);

  return { pages, route_prefixes };
}

export function buildPageIndex(pages: NavigationPage[]): PageIndex {
  const index: PageIndex = {};

  function walk(nodes: NavigationPage[]): void {
    for (const node of nodes) {
      index[node.code] = node;

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(pages);
  return index;
}

function comparePage(left: NavigationPage, right: NavigationPage): number {
  const sortDiff = left.sort_order - right.sort_order;
  if (sortDiff !== 0) return sortDiff;

  return left.name.localeCompare(right.name, "zh-CN");
}

function matchesPath(pathname: string, routePrefix: string): boolean {
  const currentSegments = splitPath(pathname);
  const routeSegments = splitPath(routePrefix);

  if (routeSegments.length === 0) {
    return currentSegments.length === 0;
  }

  if (currentSegments.length < routeSegments.length) {
    return false;
  }

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const currentSegment = currentSegments[index];

    if (!routeSegment || !currentSegment) {
      return false;
    }

    if (routeSegment.startsWith(":")) {
      continue;
    }

    if (routeSegment !== currentSegment) {
      return false;
    }
  }

  return true;
}

function buildRouteScore(routePrefix: string): number {
  const segments = splitPath(routePrefix);
  const staticCount = segments.filter((segment) => !segment.startsWith(":")).length;
  const dynamicCount = segments.length - staticCount;

  return staticCount * 1000 + segments.length * 10 - dynamicCount;
}

function buildRouteRules(routePrefixes: NavigationRoutePrefix[]): RoutePrefixRule[] {
  return routePrefixes
    .filter(
      (item) =>
        item.is_active
        && item.page_code.trim() !== ""
        && item.route_prefix.trim() !== "",
    )
    .map((item) => ({
      routePrefix: normalizePath(item.route_prefix),
      pageCode: item.page_code,
      sortOrder: item.sort_order,
      effectiveReadPermission: item.effective_read_permission,
      effectiveWritePermission: item.effective_write_permission,
    }));
}

export function resolvePageByPath({
  pathname,
  routePrefixes,
  pageIndex,
}: {
  pathname: string;
  routePrefixes: NavigationRoutePrefix[];
  pageIndex: PageIndex;
}): ResolvedPage | null {
  const normalizedPath = normalizePath(pathname);
  const rules = buildRouteRules(routePrefixes);

  const matches = rules
    .filter((rule) => matchesPath(normalizedPath, rule.routePrefix))
    .filter((rule) => rule.pageCode in pageIndex);

  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => {
    const scoreDiff = buildRouteScore(right.routePrefix) - buildRouteScore(left.routePrefix);
    if (scoreDiff !== 0) return scoreDiff;

    const sortDiff = left.sortOrder - right.sortOrder;
    if (sortDiff !== 0) return sortDiff;

    return right.routePrefix.length - left.routePrefix.length;
  });

  const matched = matches[0];
  if (!matched) return null;

  const page = pageIndex[matched.pageCode];
  if (!page) return null;

  const parent = page.parent_code ? pageIndex[page.parent_code] : null;

  return {
    pageCode: page.code,
    pageName: page.name,
    parentCode: page.parent_code,
    parentName: parent?.name ?? null,
    level: page.level,
    domainCode: page.domain_code,
    matchedRoutePrefix: matched.routePrefix,
    effectiveReadPermission: matched.effectiveReadPermission ?? page.effective_read_permission,
    effectiveWritePermission: matched.effectiveWritePermission ?? page.effective_write_permission,
    showInTopbar: page.show_in_topbar,
    showInSidebar: page.show_in_sidebar,
  };
}

export function buildActivePageCodeSet({
  activePageCode,
  pageIndex,
}: {
  activePageCode: string | null;
  pageIndex: PageIndex;
}): Set<string> {
  const activeCodes = new Set<string>();

  let currentCode = activePageCode;
  while (currentCode) {
    activeCodes.add(currentCode);
    currentCode = pageIndex[currentCode]?.parent_code ?? null;
  }

  return activeCodes;
}

export function resolveRootPageCode({
  activePageCode,
  pageIndex,
}: {
  activePageCode: string | null;
  pageIndex: PageIndex;
}): string | null {
  let currentCode = activePageCode;
  let rootCode: string | null = null;

  while (currentCode) {
    rootCode = currentCode;
    currentCode = pageIndex[currentCode]?.parent_code ?? null;
  }

  return rootCode;
}

export function buildPrimaryPathByPageCode(
  routePrefixes: NavigationRoutePrefix[],
): Record<string, string> {
  const grouped = new Map<string, NavigationRoutePrefix[]>();

  for (const item of routePrefixes) {
    if (!item.is_active) continue;

    const pageCode = item.page_code.trim();
    const routePrefix = item.route_prefix.trim();

    if (!pageCode || !routePrefix) continue;

    const items = grouped.get(pageCode) ?? [];
    items.push(item);
    grouped.set(pageCode, items);
  }

  const result: Record<string, string> = {};

  for (const [pageCode, items] of grouped.entries()) {
    items.sort((left, right) => {
      const leftStatic = isStaticRoutePrefix(left.route_prefix) ? 0 : 1;
      const rightStatic = isStaticRoutePrefix(right.route_prefix) ? 0 : 1;
      if (leftStatic !== rightStatic) return leftStatic - rightStatic;

      const sortDiff = left.sort_order - right.sort_order;
      if (sortDiff !== 0) return sortDiff;

      return left.route_prefix.length - right.route_prefix.length;
    });

    const picked = items[0];
    if (picked) {
      result[pageCode] = normalizePath(picked.route_prefix);
    }
  }

  return result;
}

export function canViewPage(page: NavigationPage, permissions: readonly string[]): boolean {
  const readPermission = page.effective_read_permission?.trim() ?? "";
  const writePermission = page.effective_write_permission?.trim() ?? "";

  if (!readPermission && !writePermission) {
    return true;
  }

  return (
    (readPermission ? permissions.includes(readPermission) : false)
    || (writePermission ? permissions.includes(writePermission) : false)
  );
}

function buildSidebarNodes({
  pages,
  primaryPathByPageCode,
  permissions,
}: {
  pages: NavigationPage[];
  primaryPathByPageCode: Record<string, string>;
  permissions: readonly string[];
}): SidebarNode[] {
  const nodes: SidebarNode[] = [];

  for (const page of [...pages].sort(comparePage)) {
    if (!page.is_active || !page.show_in_sidebar || !canViewPage(page, permissions)) {
      continue;
    }

    const children = buildSidebarNodes({
      pages: page.children,
      primaryPathByPageCode,
      permissions,
    });
    const path = primaryPathByPageCode[page.code] ?? null;

    if (!path && children.length === 0) {
      continue;
    }

    nodes.push({
      code: page.code,
      name: page.name,
      path,
      level: page.level,
      children,
    });
  }

  return nodes;
}

export function buildSidebarSections({
  pages,
  primaryPathByPageCode,
  permissions,
}: {
  pages: NavigationPage[];
  primaryPathByPageCode: Record<string, string>;
  permissions: readonly string[];
}): SidebarSection[] {
  const sections: SidebarSection[] = [];

  for (const page of [...pages].filter((item) => item.is_active).sort(comparePage)) {
    const childNodes = buildSidebarNodes({
      pages: page.children,
      primaryPathByPageCode,
      permissions,
    });

    const path = primaryPathByPageCode[page.code] ?? null;

    if (childNodes.length > 0) {
      sections.push({
        code: page.code,
        name: page.name,
        path: null,
        nodes: childNodes,
      });
      continue;
    }

    if (page.show_in_sidebar && path && canViewPage(page, permissions)) {
      sections.push({
        code: page.code,
        name: page.name,
        path,
        nodes: [],
      });
    }
  }

  return sections;
}

export function buildBreadcrumbItems({
  activePageCode,
  pageIndex,
  primaryPathByPageCode,
}: {
  activePageCode: string | null;
  pageIndex: PageIndex;
  primaryPathByPageCode: Record<string, string>;
}): NavigationBreadcrumbItem[] {
  const items: NavigationBreadcrumbItem[] = [];

  let currentCode = activePageCode;
  while (currentCode) {
    const page = pageIndex[currentCode];
    if (!page) break;

    items.push({
      code: page.code,
      name: page.name,
      path: primaryPathByPageCode[page.code] ?? null,
      level: page.level,
    });

    currentCode = page.parent_code ?? null;
  }

  return items.reverse();
}
