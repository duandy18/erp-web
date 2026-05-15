import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useSessionRuntime } from "../../runtime/useSessionRuntime";
import type { AdminUsersPresenter } from "../hooks/useAdminUsersPresenter";
import type { PermissionMatrixPagesDTO, PermissionMatrixRowDTO, UserDTO } from "../contracts/adminUsers";

type AdminUsersPanelProps = {
  presenter: AdminUsersPresenter;
};

type MatrixDraftMap = Record<number, PermissionMatrixPagesDTO>;

function normalizePages(
  source: PermissionMatrixPagesDTO | undefined,
  pageCodes: string[],
): PermissionMatrixPagesDTO {
  const out: PermissionMatrixPagesDTO = {};

  for (const pageCode of pageCodes) {
    const cell = source?.[pageCode];
    out[pageCode] = {
      read: Boolean(cell?.read),
      write: Boolean(cell?.write),
    };
  }

  return out;
}

function getCell(pages: PermissionMatrixPagesDTO | undefined, pageCode: string) {
  const cell = pages?.[pageCode];

  return {
    read: Boolean(cell?.read),
    write: Boolean(cell?.write),
  };
}

function isDirty(
  draft: PermissionMatrixPagesDTO,
  original: PermissionMatrixPagesDTO,
  pageCodes: string[],
): boolean {
  return pageCodes.some((pageCode) => {
    const left = getCell(draft, pageCode);
    const right = getCell(original, pageCode);
    return left.read !== right.read || left.write !== right.write;
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function AdminUsersPanel({ presenter }: AdminUsersPanelProps) {
  const { user, refresh } = useSessionRuntime();

  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    matrixPages,
    matrixRows,
    userDetailsById,
    loading,
    creating,
    mutating,
    error,
    createUser,
    updateUser,
    saveUserPermissionMatrix,
    deleteUser,
    resetPassword,
    setError,
  } = presenter;

  const [drafts, setDrafts] = useState<MatrixDraftMap>({});
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [rowMessage, setRowMessage] = useState<Record<number, string>>({});

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("000000");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const pageCodes = useMemo(() => matrixPages.map((page) => page.page_code), [matrixPages]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const next: MatrixDraftMap = {};

      for (const row of matrixRows) {
        next[row.user_id] = normalizePages(row.pages, pageCodes);
      }

      setDrafts(next);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [matrixRows, pageCodes]);

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return matrixRows.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (!normalizedKeyword) return true;

      const detail = userDetailsById[row.user_id];
      const haystack = [
        row.username,
        row.full_name ?? "",
        detail?.full_name ?? "",
        detail?.phone ?? "",
        detail?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [keyword, matrixRows, statusFilter, userDetailsById]);

  function isCurrentUser(row: PermissionMatrixRowDTO): boolean {
    return row.user_id === user?.id || row.username === user?.username;
  }

  function isProtectedSelfSystemCell(row: PermissionMatrixRowDTO, pageCode: string): boolean {
    return isCurrentUser(row) && pageCode === "erp.system";
  }

  function setDraftCell(userId: number, pageCode: string, field: "read" | "write") {
    if (!canManage) return;

    const row = matrixRows.find((item) => item.user_id === userId);
    if (row && isProtectedSelfSystemCell(row, pageCode)) {
      setRowMessage((prev) => ({
        ...prev,
        [userId]: "当前登录用户自己的系统管理权限不能在前端取消。",
      }));
      return;
    }

    setDrafts((prev) => {
      const current = normalizePages(prev[userId], pageCodes);
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;
    if (!newUsername.trim()) {
      setError("请填写用户名");
      return;
    }

    await createUser({
      username: newUsername.trim(),
      password: newPassword,
      full_name: newFullName.trim() || null,
      phone: newPhone.trim() || null,
      email: newEmail.trim() || null,
    });

    setNewUsername("");
    setNewPassword("000000");
    setNewFullName("");
    setNewPhone("");
    setNewEmail("");
  }

  async function handleSave(row: PermissionMatrixRowDTO) {
    if (!canManage) return;

    const draft = normalizePages(drafts[row.user_id], pageCodes);
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

    try {
      await saveUserPermissionMatrix(row.user_id, draft);
      if (isCurrentUser(row)) {
        await refresh();
      }
      setRowMessage((prev) => ({ ...prev, [row.user_id]: "权限已保存" }));
    } catch (currentError) {
      setRowMessage((prev) => ({
        ...prev,
        [row.user_id]: errorMessage(currentError, "保存失败"),
      }));
    }
  }

  async function handleToggleActive(row: PermissionMatrixRowDTO) {
    if (!canManage) return;
    await updateUser(row.user_id, { is_active: !row.is_active });
  }

  async function handleDelete(row: PermissionMatrixRowDTO) {
    if (!canManage || isCurrentUser(row)) return;
    if (!window.confirm(`确认删除用户「${row.username}」？`)) return;

    await deleteUser(row.user_id);
  }

  async function handleReset(row: PermissionMatrixRowDTO) {
    if (!canManage) return;
    if (!window.confirm(`确认将用户「${row.username}」密码重置为 000000？`)) return;

    await resetPassword(row.user_id);
    setRowMessage((prev) => ({ ...prev, [row.user_id]: "密码已重置为 000000" }));
  }

  async function handleInlineProfileSave(row: PermissionMatrixRowDTO, detail: UserDTO | undefined) {
    if (!canManage) return;

    const fullName = window.prompt("姓名", detail?.full_name ?? row.full_name ?? "");
    if (fullName === null) return;

    const phone = window.prompt("电话", detail?.phone ?? "");
    if (phone === null) return;

    const email = window.prompt("邮箱", detail?.email ?? "");
    if (email === null) return;

    await updateUser(row.user_id, {
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
    });
  }

  if (!canRead) {
    return (
      <div className="admin-users-card">
        <p>当前账号无系统管理页面访问权限。</p>
      </div>
    );
  }

  return (
    <div className="admin-users-stack">
      {error ? <div className="admin-users-alert danger">{error}</div> : null}

      {!canManage ? (
        <div className="admin-users-alert">
          当前为只读模式，不能创建、编辑、删除用户或保存权限。
        </div>
      ) : null}

      {canManage ? (
        <form className="admin-users-card admin-users-form-grid" onSubmit={handleCreate}>
          <div className="admin-users-form-intro">
            <h2>创建用户</h2>
            <p>新用户默认不授予页面权限。创建后在下方矩阵勾选读写权限。</p>
          </div>

          <label>
            <span>登录名</span>
            <input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} />
          </label>

          <label>
            <span>密码</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label>
            <span>姓名</span>
            <input value={newFullName} onChange={(event) => setNewFullName(event.target.value)} />
          </label>

          <label>
            <span>电话</span>
            <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} />
          </label>

          <label>
            <span>邮箱</span>
            <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
          </label>

          <button type="submit" className="admin-users-button primary" disabled={creating}>
            {creating ? "创建中…" : "创建用户"}
          </button>
        </form>
      ) : null}

      <section className="admin-users-card">
        <div className="admin-users-table-header">
          <div>
            <h2>用户权限矩阵</h2>
            <p>按一级页面授权；写权限会自动包含读权限。</p>
          </div>

          <div className="admin-users-toolbar">
            <input
              placeholder="搜索用户"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
            >
              <option value="all">全部</option>
              <option value="active">仅启用</option>
              <option value="inactive">仅停用</option>
            </select>
          </div>
        </div>

        {loading ? <div className="admin-users-alert">加载中…</div> : null}

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>姓名 / 联系方式</th>
                <th>状态</th>
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
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5 + matrixPages.length} className="admin-users-empty-cell">
                    暂无符合条件的用户
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const detail = userDetailsById[row.user_id];
                  const draft = normalizePages(drafts[row.user_id], pageCodes);
                  const dirty = isDirty(draft, normalizePages(row.pages, pageCodes), pageCodes);

                  return (
                    <tr key={row.user_id}>
                      <td>{row.user_id}</td>
                      <td>
                        <div className="admin-users-strong">{row.username}</div>
                        {isCurrentUser(row) ? (
                          <div className="admin-users-muted">当前登录用户</div>
                        ) : null}
                      </td>
                      <td>
                        <div>{row.full_name || detail?.full_name || "-"}</div>
                        <div className="admin-users-muted">
                          {detail?.phone || "-"} / {detail?.email || "-"}
                        </div>
                      </td>
                      <td>
                        <span
                          className={
                            row.is_active
                              ? "admin-users-status success"
                              : "admin-users-status muted"
                          }
                        >
                          {row.is_active ? "启用" : "停用"}
                        </span>
                      </td>

                      {matrixPages.map((page) => {
                        const cell = getCell(draft, page.page_code);
                        const protectedSelfSystem = isProtectedSelfSystemCell(row, page.page_code);

                        return (
                          <td key={`${row.user_id}-${page.page_code}`}>
                            <label className="admin-users-matrix-check">
                              <input
                                type="checkbox"
                                checked={cell.read}
                                disabled={!canManage || mutating || protectedSelfSystem}
                                onChange={() => setDraftCell(row.user_id, page.page_code, "read")}
                              />
                              <span>读</span>
                            </label>
                            <label className="admin-users-matrix-check">
                              <input
                                type="checkbox"
                                checked={cell.write}
                                disabled={!canManage || mutating || protectedSelfSystem}
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
                        <div className="admin-users-row-actions">
                          <button
                            type="button"
                            className="admin-users-button secondary"
                            disabled={!canManage || mutating || !dirty}
                            onClick={() => {
                              void handleSave(row);
                            }}
                          >
                            保存权限
                          </button>
                          <button
                            type="button"
                            className="admin-users-button secondary"
                            disabled={!canManage || mutating}
                            onClick={() => {
                              void handleInlineProfileSave(row, detail);
                            }}
                          >
                            编辑资料
                          </button>
                          <button
                            type="button"
                            className="admin-users-button secondary"
                            disabled={!canManage || mutating}
                            onClick={() => {
                              void handleToggleActive(row);
                            }}
                          >
                            {row.is_active ? "停用" : "启用"}
                          </button>
                          <button
                            type="button"
                            className="admin-users-button secondary"
                            disabled={!canManage || mutating}
                            onClick={() => {
                              void handleReset(row);
                            }}
                          >
                            重置密码
                          </button>
                          <button
                            type="button"
                            className="admin-users-button danger"
                            disabled={!canManage || mutating || isCurrentUser(row)}
                            onClick={() => {
                              void handleDelete(row);
                            }}
                          >
                            删除
                          </button>
                        </div>

                        {dirty ? <div className="admin-users-muted">本行有未保存修改</div> : null}
                        {rowMessage[row.user_id] ? (
                          <div className="admin-users-muted">{rowMessage[row.user_id]}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
