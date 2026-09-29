import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress known Vite HMR WebSocket errors in iframe environment
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || event?.reason?.toString() || '';
  if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('ws:')) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
