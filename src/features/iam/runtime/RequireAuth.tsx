import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useSessionRuntime } from "./useSessionRuntime";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { status } = useSessionRuntime();

  if (status === "initializing") {
    return (
      <div className="page-stack">
        <section className="page-heading">
          <div className="eyebrow">IAM</div>
          <h2>正在加载会话</h2>
          <p>正在读取当前用户和后端页面导航。</p>
        </section>
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
