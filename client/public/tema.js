// Aplica el tema guardado ANTES de pintar la página: sin destello blanco al abrir en modo oscuro.
try {
  if (localStorage.getItem('tema') === 'oscuro') document.documentElement.setAttribute('data-bs-theme', 'dark');
} catch { /* sin almacenamiento: modo claro */ }
