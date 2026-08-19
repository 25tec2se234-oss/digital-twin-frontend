import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './tailwind.css';

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.error("Failed to find the root element.");
}
