import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import { APP_BASE_PATH } from "./shared/config";
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter basename={APP_BASE_PATH === "/" ? undefined : APP_BASE_PATH}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
