/** Utilidades de fechas AAAA-MM-DD (días de Colombia). Se operan en UTC para no depender de la zona del equipo. */
import { fechaArchivo } from './format';

export const hoy = () => fechaArchivo();

const toDate = (dia) => new Date(`${dia}T00:00:00Z`);
const toDia = (d) => d.toISOString().slice(0, 10);

export const sumarDias = (dia, n) => {
  const d = toDate(dia);
  d.setUTCDate(d.getUTCDate() + n);
  return toDia(d);
};

export const diasEntre = (desde, hasta) => Math.round((toDate(hasta) - toDate(desde)) / 86400000) + 1;

/** Lunes a domingo de la semana que contiene `dia`. */
export const semanaDe = (dia) => {
  const dow = (toDate(dia).getUTCDay() + 6) % 7; // 0 = lunes
  const desde = sumarDias(dia, -dow);
  return { desde, hasta: sumarDias(desde, 6) };
};

/** Primer y último día del mes que contiene `dia`. */
export const mesDe = (dia) => {
  const d = toDate(dia);
  const desde = toDia(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
  const hasta = toDia(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  return { desde, hasta };
};

const fmt = (dia, opts) => toDate(dia).toLocaleDateString('es-CO', { timeZone: 'UTC', ...opts });

/** "lun 22" */
export const diaCorto = (dia) => fmt(dia, { weekday: 'short', day: 'numeric' }).replace('.', '');

/** "Lunes 22 de septiembre" */
export const diaLargo = (dia) => {
  const t = fmt(dia, { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "Septiembre 2026" */
export const mesLargo = (dia) => {
  const t = fmt(dia, { month: 'long', year: 'numeric' }).replace(' de ', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "22 sep – 28 sep 2026" */
export const rangoCorto = (desde, hasta) =>
  `${fmt(desde, { day: 'numeric', month: 'short' })} – ${fmt(hasta, { day: 'numeric', month: 'short', year: 'numeric' })}`.replace(/\./g, '');
