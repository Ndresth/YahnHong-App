import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'

import './index.css'

// Tras un deploy, una pestaña vieja puede pedir archivos que ya no existen: recargar lo arregla.
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('recargaPorChunk') === '1') return;
    sessionStorage.setItem('recargaPorChunk', '1');
  } catch { /* sin storage */ }
  e.preventDefault();
  window.location.reload();
});
// Si la app cargó bien, se permite otra recarga automática en el futuro
setTimeout(() => { try { sessionStorage.removeItem('recargaPorChunk'); } catch { /* sin storage */ } }, 10000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
