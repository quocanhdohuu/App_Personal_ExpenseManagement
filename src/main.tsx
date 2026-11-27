import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Khóa hoàn toàn thao tác thu phóng bằng 2 ngón tay (pinch-to-zoom) trên iOS Safari & Chrome Mobile
if (typeof document !== 'undefined') {
  const preventZoom = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', preventZoom, { passive: false });
  document.addEventListener('gesturechange', preventZoom, { passive: false });
  document.addEventListener('gestureend', preventZoom, { passive: false });
  document.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
