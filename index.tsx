
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (!container) {
  console.error("Critical Error: Root container not found in the DOM.");
} else {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render Magira CRM:", error);
    container.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>System Initialization Failed</h2>
      <p>Please refresh the page or contact support.</p>
    </div>`;
  }
}
