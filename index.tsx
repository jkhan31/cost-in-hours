import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

/**
 * Service Worker Registration
 * We use window.location.origin to ensure the registration attempt 
 * matches the current page's origin, which is required by browsers.
 * In sandboxed environments (like AI Studio), this prevents the 
 * "origin mismatch" security error.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .then(registration => {
        console.debug("ServiceWorker registered with scope:", registration.scope);
      })
      .catch(error => {
        console.debug("ServiceWorker registration failed:", error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);