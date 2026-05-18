export function SystemAppsFrontendPagesPanel() {
  return (
    <section className="admin-apps-card">
      <div className="admin-apps-table-header">
        <div>
          <h2>独立系统前端页面目录</h2>
          <p>
            第一阶段只保留页面目录入口。后续接入 self-description 查询接口后，这里只展示
            app manifest 简要信息和 page catalog，不展开 service capabilities / dependencies
            的完整治理逻辑。
          </p>
        </div>
      </div>

      <div className="admin-apps-profile-grid">
        <article className="admin-apps-profile-link">
          <span>数据来源</span>
          <strong>GET /admin/app-registry/apps/:code/self-description</strong>
        </article>

        <article className="admin-apps-profile-link">
          <span>展示范围</span>
          <strong>app manifest + page catalog</strong>
        </article>

        <article className="admin-apps-profile-link">
          <span>页面字段</span>
          <strong>route_path / parent_page_code / level / permissions</strong>
        </article>
      </div>
    </section>
  );
}
