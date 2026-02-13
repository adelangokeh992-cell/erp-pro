import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Sentry - error monitoring (optional, set REACT_APP_SENTRY_DSN in .env)
const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
if (sentryDsn) {
  try {
    const Sentry = require("@sentry/react");
    Sentry.init({
      dsn: sentryDsn,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
    window.Sentry = Sentry;
  } catch (e) {
    console.warn("Sentry init failed:", e);
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
