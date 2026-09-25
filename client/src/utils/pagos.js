import { money } from './format';

/** Pagos de una orden: dividido (o.pagos) o todo el total con cliente.metodoPago. Igual que server/lib/pagos.js */
export const pagosDe = (o) => (o?.pagos?.length
  ? o.pagos
  : [{ metodo: !o?.cliente?.metodoPago || o.cliente.metodoPago === 'Efectivo/QR' ? 'Efectivo' : o.cliente.metodoPago, monto: o?.total || 0 }]);

/** "Efectivo $20.000 + Nequi $30.000" o "Nequi". */
export const textoPago = (o) => {
  const p = pagosDe(o);
  return p.length > 1 ? p.map(x => `${x.metodo} ${money(x.monto)}`).join(' + ') : p[0].metodo;
};

/** Pago dividido listo para enviar: la última parte es lo que falta para el total. */
export const partesCompletas = (partes, total) => {
  const fijas = partes.slice(0, -1).map(p => ({ metodo: p.metodo, monto: Math.round(Number(p.monto) || 0) }));
  const resto = total - fijas.reduce((a, p) => a + p.monto, 0);
  return [...fijas, { metodo: partes[partes.length - 1].metodo, monto: resto }];
};

export const pagoDivididoValido = (partes, total) =>
  partesCompletas(partes, total).every(p => p.monto > 0) && new Set(partes.map(p => p.metodo)).size === partes.length;
