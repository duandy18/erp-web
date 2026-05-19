import { useMemo, useState } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import "../admin-users/adminUsers.css";
import type {
  PermissionMatrixPagesDTO,
  PermissionMatrixRowDTO,
} from "../admin-users/contracts/adminUsers";
import { useAdminUsersPresenter } from "../admin-users/hooks/useAdminUsersPresenter";
import { useSessionRuntime } from "../runtime/useSessionRuntime";

type MatrixDraftMap = Record<number, PermissionMatrixPagesDTO>;

function getCell(pages: PermissionMatrixPagesDTO | undefined, pageCode: string) {
  const cell = pages?.[pageCode];

  return {
    read: Boolean(cell?.read),
    write: Boolean(cell?.write),
  };
}

function normalizePages(
  source: PermissionMatrixPagesDTO | undefined,
  pageCodes: string[],
): PermissionMatrixPagesDTO {
  const out: PermissionMatrixPagesDTO = {};

  for (const pageCode of pageCodes) {
    out[pageCode] = getCell(source, pageCode);
  }

  return out;
}

function countAssignedCells(rows: PermissionMatrixRowDTO[]): number {
  return rows.reduce(
    (total, row) =>
      total + Object.values(row.pages).filter((cell) => cell.read || cell.write).length,
    0,
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function ErpPermissionsPage() {
  const { token, user, refresh } = useSessionRuntime();
  const presenter = useAdminUsersPresenter(token);
  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const { error, loading, matrixPages, matrixRows, mutating, saveUserPermissionMatrix } = presenter;
  const [drafts, setDrafts] = useState<MatrixDraftMap>({});
  const [rowMessage, setRowMessage] = useState<Record<number, string>>({});

  const pageCodes = useMemo(() => matrixPages.map((page) => page.page_code), [matrixPages]);

  function isCurrentUser(row: PermissionMatrixRowDTO): boolean {
    return row.user_id === user?.id || row.username === user?.username;
  }

  function isProtectedSelfSystemCell(row: PermissionMatrixRowDTO, pageCode: string): boolean {
    return isCurrentUser(row) && pageCode === "erp.system";
  }

  function setDraftCell(userId: number, pageCode: string, field: "read" | "write") {
    if (!canManage) {
      return;
    }

    const row = matrixRows.find((item) => item.user_id === userId);
    if (row && isProtectedSelfSystemCell(row, pageCode)) {
      setRowMessage((prev) => ({
        ...prev,
        [userId]: "当前登录用户自己的系统管理权限不能在前端取消。",
      }));
      return;
    }

    setDrafts((prev) => {
      const current = normalizePages(prev[userId] ?? row?.pages, pageCodes);
      const cell = getCell(current, pageCode);

      if (field === "write") {
        const nextWrite = !cell.write;

        return {
          ...prev,
          [userId]: {
            ...current,
            [pageCode]: {
              read: nextWrite ? true : cell.read,
              write: nextWrite,
            },
          },
        };
      }

      const nextRead = !cell.read;

      return {
        ...prev,
        [userId]: {
          ...current,
          [pageCode]: {
            read: nextRead,
            write: nextRead ? cell.write : false,
          },
        },
      };
    });
  }

  async function handleSave(row: PermissionMatrixRowDTO): Promise<void> {
    const draft = normalizePages(drafts[row.user_id] ?? row.pages, pageCodes);

    if (isCurrentUser(row)) {
      const systemCell = getCell(draft, "erp.system");
      if (!systemCell.read || !systemCell.write) {
        setRowMessage((prev) => ({
          ...prev,
          [row.user_id]: "当前登录用户自己的系统管理读写权限不能取消。",
        }));
        return;
      }
    }

    await saveUserPermissionMatrix(row.user_id, draft);

    if (isCurrentUser(row)) {
      await refresh();
    }

    setRowMessage((prev) => ({ ...prev, [row.user_id]: "ERP 权限已保存" }));
  }

  if (!canRead) {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <div className="eyebrow">IAM</div>
          <h2>ERP 权限</h2>
          <p>当前账号无系统管理页面访问权限。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">IAM</div>
        <h2>ERP 权限</h2>
        <p>配置用户访问 ERP 控制面页面的读写权限。这里只影响 ERP 自身权限。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-profile-grid">
          <SummaryCard label="用户数" value={matrixRows.length} />
          <SummaryCard label="ERP 页面数" value={matrixPages.length} />
          <SummaryCard label="已授权单元" value={countAssignedCells(matrixRows)} />
        </div>
      </section>

      {error ? <div className="admin-users-alert danger">{error}</div> : null}
      {loading ? <div className="admin-users-alert">正在加载 ERP 权限矩阵…</div> : null}

      <section className="admin-users-card">
        <div className="admin-users-table-header">
          <div>
            <h2>ERP 页面权限矩阵</h2>
            <p>写权限会自动包含读权限。</p>
          </div>
        </div>

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>用户</th>
                {matrixPages.map((page) => (
                  <th key={page.page_code}>
                    <div>{page.page_name}</div>
                    <div className="admin-users-muted">{page.page_code}</div>
                  </th>
                ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => {
                const draft = normalizePages(drafts[row.user_id] ?? row.pages, pageCodes);

                return (
                  <tr key={row.user_id}>
                    <td>
                      <div className="admin-users-strong">{row.username}</div>
                      <div className="admin-users-muted">{row.full_name ?? "-"}</div>
                    </td>

                    {matrixPages.map((page) => {
                      const cell = getCell(draft, page.page_code);
                      const protectedSelfSystem = isProtectedSelfSystemCell(row, page.page_code);

                      return (
                        <td key={`${row.user_id}-${page.page_code}`}>
                          <label className="admin-users-matrix-check">
                            <input
                              checked={cell.read}
                              disabled={!canManage || mutating || protectedSelfSystem}
                              type="checkbox"
                              onChange={() => setDraftCell(row.user_id, page.page_code, "read")}
                            />
                            <span>读</span>
                          </label>

                          <label className="admin-users-matrix-check">
                            <input
                              checked={cell.write}
                              disabled={!canManage || mutating || protectedSelfSystem}
                              type="checkbox"
                              onChange={() => setDraftCell(row.user_id, page.page_code, "write")}
                            />
                            <span>写</span>
                          </label>

                          {protectedSelfSystem ? (
                            <div className="admin-users-muted">受保护</div>
                          ) : null}
                        </td>
                      );
                    })}

                    <td>
                      <button
                        className="admin-users-button secondary"
                        disabled={!canManage || mutating}
                        type="button"
                        onClick={() => {
                          void handleSave(row);
                        }}
                      >
                        保存 ERP 权限
                      </button>

                      {rowMessage[row.user_id] ? (
                        <div className="admin-users-muted">{rowMessage[row.user_id]}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}

              {matrixRows.length === 0 ? (
                <tr>
                  <td className="admin-users-empty-cell" colSpan={matrixPages.length + 2}>
                    暂无用户权限矩阵
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
