import { useSyncExternalStore } from 'react';

// Modo claro/oscuro con el sistema de color de Bootstrap 5.3 (atributo data-bs-theme en <html>).
// La elección se guarda en este equipo; public/tema.js la aplica antes de pintar la página.
const raiz = () => document.documentElement;
const leer = () => (raiz().getAttribute('data-bs-theme') === 'dark' ? 'oscuro' : 'claro');
const suscriptores = new Set();

const aplicar = (tema) => {
  raiz().setAttribute('data-bs-theme', tema === 'oscuro' ? 'dark' : 'light');
  suscriptores.forEach(f => f());
};

// Si se cambia en otra pestaña del mismo equipo, se aplica aquí también
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === 'tema') aplicar(e.newValue === 'oscuro' ? 'oscuro' : 'claro'); });
}

const suscribir = (f) => { suscriptores.add(f); return () => suscriptores.delete(f); };

export function useTema() {
  const tema = useSyncExternalStore(suscribir, leer, () => 'claro');
  const alternar = () => {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    try { localStorage.setItem('tema', nuevo); } catch { /* sin almacenamiento: dura hasta recargar */ }
    aplicar(nuevo);
  };
  return { tema, oscuro: tema === 'oscuro', alternar };
}
