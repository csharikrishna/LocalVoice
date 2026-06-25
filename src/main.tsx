import i18n from "./lib/i18n";
import { I18nextProvider } from "react-i18next";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

// --- Console Cleanup ---
// Suppresses known harmless 3rd-party warnings for a cleaner developer experience.
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
  if (args.some((arg) => typeof arg === "string" && arg.includes("Download the React DevTools")))
    return;
  originalLog(...args);
};

console.warn = (...args) => {
  if (args.some((arg) => typeof arg === "string" && arg.includes("willReadFrequently"))) return;
  originalWarn(...args);
};

console.error = (...args) => {
  if (args.some((arg) => typeof arg === "string" && arg.includes("BloomFilter"))) return;
  originalError(...args);
};
// -----------------------

const router = getRouter();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </React.StrictMode>,
);
