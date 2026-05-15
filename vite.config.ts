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
  },
  preview: {
    host: "0.0.0.0",
    port: 5170,
  },
});
