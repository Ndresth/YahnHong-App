/** Cierre hecho pero sin Excel descargado (se retoma aunque se recargue la página). */
export const PENDIENTE_KEY = 'cierrePendienteExcel';

export const getCierrePendiente = () => {
  try { return JSON.parse(localStorage.getItem(PENDIENTE_KEY) || 'null'); } catch { return null; }
};
