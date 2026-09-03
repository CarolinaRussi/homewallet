import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { LocaleProvider } from "./shared/lib/i18n/locale-context";
import { queryClient } from "./shared/lib/query-client";
import { ThemeProvider } from "./shared/lib/theme/theme-context";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
