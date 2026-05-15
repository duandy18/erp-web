export function SystemUsersPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div className="eyebrow">IAM</div>
        <h2>用户管理</h2>
        <p>
          当前页面已由后端 page_registry 注册为 erp.system.users。
          真实用户管理表格后续接 /admin/users 合同。
        </p>
      </section>
    </div>
  );
}
