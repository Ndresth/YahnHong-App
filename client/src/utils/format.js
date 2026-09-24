const moneyFmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export const money = (n) => `$${moneyFmt.format(Number(n) || 0)}`;

export const hora = (d) => new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/** Precios > 0 de un producto como [[tamaño, precio], ...] ordenados de mayor a menor. */
export const preciosActivos = (p) =>
  Object.entries(p?.precios || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);

export const precioDesde = (p) => {
  const v = preciosActivos(p).map(([, x]) => x);
  return v.length ? Math.min(...v) : 0;
};

export const minutosDesde = (d, now = Date.now()) => Math.max(0, Math.floor((now - new Date(d).getTime()) / 60000));

/** Fecha AAAA-MM-DD en hora de Colombia (para nombres de archivo). */
export const fechaArchivo = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export const fechaLarga = (d) => {
  const t = new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
