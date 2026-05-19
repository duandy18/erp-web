import { useMemo, useState, type FormEvent } from "react";

import "../../app-registry/admin-apps/adminApps.css";
import "../admin-users/adminUsers.css";
import type { PermissionMatrixRowDTO } from "../admin-users/contracts/adminUsers";
import { useAdminUsersPresenter } from "../admin-users/hooks/useAdminUsersPresenter";
import { useSessionRuntime } from "../runtime/useSessionRuntime";

function emptyText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="admin-apps-profile-link">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function UserAccountsPage() {
  const { token, user } = useSessionRuntime();
  const presenter = useAdminUsersPresenter(token);
  const canManage = Boolean(user?.permissions.includes("page.erp.system.write"));
  const canRead = canManage || Boolean(user?.permissions.includes("page.erp.system.read"));

  const {
    creating,
    createUser,
    deleteUser,
    error,
    loading,
    matrixRows,
    mutating,
    resetPassword,
    updateUser,
    userDetailsById,
  } = presenter;

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("000000");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const activeCount = useMemo(
    () => matrixRows.filter((row) => row.is_active).length,
    [matrixRows],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canManage) {
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

  async function handleEdit(row: PermissionMatrixRowDTO): Promise<void> {
    const detail = userDetailsById[row.user_id];

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

  async function handleReset(row: PermissionMatrixRowDTO): Promise<void> {
    if (!window.confirm(`确认将用户「${row.username}」密码重置为 000000？`)) {
      return;
    }

    await resetPassword(row.user_id);
  }

  async function handleDelete(row: PermissionMatrixRowDTO): Promise<void> {
    if (row.user_id === user?.id) {
      return;
    }

    if (!window.confirm(`确认删除用户「${row.username}」？`)) {
      return;
    }

    await deleteUser(row.user_id);
  }

  if (!canRead) {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <div className="eyebrow">IAM</div>
          <h2>用户账号</h2>
          <p>当前账号无系统管理页面访问权限。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">IAM</div>
        <h2>用户账号</h2>
        <p>维护 ERP 登录用户基础信息。页面权限和应用权限在其他 Tab 配置。</p>
      </section>

      <section className="admin-apps-card">
        <div className="admin-apps-profile-grid">
          <SummaryCard label="用户总数" value={matrixRows.length} />
          <SummaryCard label="启用用户" value={activeCount} />
          <SummaryCard label="停用用户" value={matrixRows.length - activeCount} />
        </div>
      </section>

      {error ? <div className="admin-users-alert danger">{error}</div> : null}
      {loading ? <div className="admin-users-alert">正在加载用户账号…</div> : null}

      {canManage ? (
        <form className="admin-users-card admin-users-form-grid" onSubmit={handleCreate}>
          <div className="admin-users-form-intro">
            <h2>新建用户</h2>
            <p>新用户默认不授予 ERP 页面权限和应用权限。</p>
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

          <button className="admin-users-button primary" disabled={creating} type="submit">
            {creating ? "创建中…" : "创建用户"}
          </button>
        </form>
      ) : null}

      <section className="admin-users-card">
        <div className="admin-users-table-header">
          <div>
            <h2>用户列表</h2>
            <p>这里只管理用户基础信息，不配置权限。</p>
          </div>
        </div>

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>姓名</th>
                <th>联系方式</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => {
                const detail = userDetailsById[row.user_id];

                return (
                  <tr key={row.user_id}>
                    <td>{row.user_id}</td>
                    <td className="admin-users-strong">{row.username}</td>
                    <td>{emptyText(detail?.full_name ?? row.full_name)}</td>
                    <td>
                      <div>{emptyText(detail?.phone)}</div>
                      <div className="admin-users-muted">{emptyText(detail?.email)}</div>
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
                    <td>
                      <div className="admin-users-row-actions">
                        <button
                          className="admin-users-button secondary"
                          disabled={!canManage || mutating}
                          type="button"
                          onClick={() => {
                            void handleEdit(row);
                          }}
                        >
                          编辑资料
                        </button>

                        <button
                          className="admin-users-button secondary"
                          disabled={!canManage || mutating}
                          type="button"
                          onClick={() => {
                            void updateUser(row.user_id, { is_active: !row.is_active });
                          }}
                        >
                          {row.is_active ? "停用" : "启用"}
                        </button>

                        <button
                          className="admin-users-button secondary"
                          disabled={!canManage || mutating}
                          type="button"
                          onClick={() => {
                            void handleReset(row);
                          }}
                        >
                          重置密码
                        </button>

                        <button
                          className="admin-users-button danger"
                          disabled={!canManage || mutating || row.user_id === user?.id}
                          type="button"
                          onClick={() => {
                            void handleDelete(row);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {matrixRows.length === 0 ? (
                <tr>
                  <td className="admin-users-empty-cell" colSpan={6}>
                    暂无用户
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
