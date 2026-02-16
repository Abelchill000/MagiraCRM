
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("Magira CRM: Starting initialization...");

const container = document.getElementById('root');

if (!container) {
  const err = "Critical Error: Root container not found in the DOM.";
  console.error(err);
  document.body.innerHTML = `<div style="color: red; padding: 20px;">${err}</div>`;
} else {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Magira CRM: Render command issued.");
  } catch (error) {
    console.error("Failed to render Magira CRM:", error);
    container.innerHTML = `
      <div style="padding: 40px; color: #dc2626; font-family: sans-serif; text-align: center;">
        <h2 style="font-weight: 800;">Initialization Failed</h2>
        <p style="color: #64748b;">The distribution system could not start.</p>
        <pre style="text-align: left; background: #f1f5f9; padding: 15px; border-radius: 10px; font-size: 12px; margin-top: 20px; overflow-x: auto;">
          ${error instanceof Error ? error.stack : String(error)}
        </pre>
      </div>
    `;
  }
}
