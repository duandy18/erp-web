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

type RowSaveResult = {
  status: "success" | "failure";
  message: string;
  finishedAt: string;
};

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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "暂无";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function operationTimeNow(): string {
  return new Date().toLocaleString("zh-CN", {
    hour12: false,
  });
}

function saveResultClassName(result: RowSaveResult): string {
  return result.status === "success" ? "admin-users-status success" : "admin-users-status muted";
}

export function ErpPermissionsPage() {
  const { token, user, refresh } = useSessionRuntime();
  const presenter = useAdminUsersPresenter(token);
  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const { error, loading, matrixPages, matrixRows, mutating, saveUserPermissionMatrix } = presenter;
  const [drafts, setDrafts] = useState<MatrixDraftMap>({});
  const [rowSaveResult, setRowSaveResult] = useState<Record<number, RowSaveResult>>({});

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
      setRowSaveResult((prev) => ({
        ...prev,
        [userId]: {
          status: "failure",
          message: "当前登录用户自己的系统管理权限不能在前端取消。",
          finishedAt: operationTimeNow(),
        },
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
        setRowSaveResult((prev) => ({
          ...prev,
          [row.user_id]: {
            status: "failure",
            message: "当前登录用户自己的系统管理读写权限不能取消。",
            finishedAt: operationTimeNow(),
          },
        }));
        return;
      }
    }

    try {
      const result = await saveUserPermissionMatrix(row.user_id, draft);

      if (isCurrentUser(row)) {
        await refresh();
      }

      setRowSaveResult((prev) => ({
        ...prev,
        [row.user_id]: {
          status: "success",
          message: result.message,
          finishedAt: formatDateTime(result.saved_at),
        },
      }));
    } catch (currentError) {
      setRowSaveResult((prev) => ({
        ...prev,
        [row.user_id]: {
          status: "failure",
          message: errorMessage(currentError, "保存 ERP 权限失败"),
          finishedAt: operationTimeNow(),
        },
      }));
    }
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
                <th>保存结果</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => {
                const draft = normalizePages(drafts[row.user_id] ?? row.pages, pageCodes);
                const saveResult = rowSaveResult[row.user_id];

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
                      {saveResult ? (
                        <>
                          <span className={saveResultClassName(saveResult)}>
                            {saveResult.status === "success" ? "保存成功" : "保存失败"}
                          </span>
                          <div className="admin-users-muted">{saveResult.message}</div>
                          <div className="admin-users-muted">{saveResult.finishedAt}</div>
                        </>
                      ) : (
                        <span className="admin-users-muted">-</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="admin-users-button secondary"
                        disabled={!canManage || mutating}
                        type="button"
                        onClick={() => {
                          void handleSave(row);
                        }}
                      >
                        {mutating ? "保存中…" : "保存 ERP 权限"}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {matrixRows.length === 0 ? (
                <tr>
                  <td className="admin-users-empty-cell" colSpan={matrixPages.length + 3}>
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
