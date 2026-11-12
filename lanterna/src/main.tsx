import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RouterProvider } from "./lib/router";
import { AppProvider } from "./store/app";
import { UIProvider } from "./store/ui";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
      <UIProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </UIProvider>
    </RouterProvider>
  </StrictMode>,
);
