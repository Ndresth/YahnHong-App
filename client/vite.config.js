import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import purgecss from '@fullhuman/postcss-purgecss'
import { fileURLToPath } from 'node:url'

// En el build se eliminan del CSS (Bootstrap + Bootstrap Icons + estilos propios) las clases que
// el código no usa: el CSS pasa de ~330 KB a una fracción y la web carga más rápido en celular.
// Las clases se buscan como texto en el código, así que deben escribirse completas
// (ej. 'btn-success', nunca 'btn-' + color).
const ruta = (r) => fileURLToPath(new URL(r, import.meta.url))
export const PURGE = {
  content: [ruta('./index.html'), ruta('./src/**/*.{js,jsx}'), ruta('../shared/**/*.json')],
  // Clases que ponen las librerías (gráficas, alertas, avisos) y etiquetas que no aparecen en JSX
  safelist: {
    standard: [
      'html', 'body', 'svg', 'show', 'fade', 'active', 'disabled',
      // Etiquetas que crean las alertas (SweetAlert2) aunque no estén en el código
      /^h[1-6]$/, 'p', 'a', 'b', 'strong', 'small', 'hr', 'ul', 'ol', 'li', 'img', 'label', 'input', 'textarea', 'select', 'button', 'table'
    ],
    greedy: [/^recharts-/, /^swal2-/, /^go\d/, /data-bs-theme/] // data-bs-theme: modo claro/oscuro de Bootstrap
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  css: {
    postcss: { plugins: command === 'build' ? [purgecss(PURGE)] : [] }
  },
  server: {
    // En desarrollo, /api va al servidor Express local
    proxy: { '/api': 'http://localhost:3000' },
    // Permite importar ../shared/config.json (configuración común con el servidor)
    fs: { allow: ['..'] }
  }
}))
