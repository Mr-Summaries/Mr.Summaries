import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress ResizeObserver loop limit exceeded error
const resizeObserverError = 'ResizeObserver loop completed with undelivered notifications.';
window.addEventListener('error', (e) => {
  if (e.message === resizeObserverError || e.message === 'ResizeObserver loop limit exceeded') {
    const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
    const resizeObserverErrStyle = document.getElementById('webpack-dev-server-client-overlay');
    if (resizeObserverErrDiv) resizeObserverErrDiv.setAttribute('style', 'display: none');
    if (resizeObserverErrStyle) resizeObserverErrStyle.setAttribute('style', 'display: none');
    e.stopImmediatePropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
