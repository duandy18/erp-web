import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const normalizeBase = (value: string | undefined): string => {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

export default defineConfig({
  base: normalizeBase(process.env.VITE_APP_BASE_PATH),
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5170,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:7990",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5170,
  },
});
