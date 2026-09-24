import { DESECHABLES } from '../config';

export const DESECHABLES_VACIO = { cucharas: 0, platos: 0, vasos: 0 };

/** Desechables que aplican al carrito actual (los vasos sólo si hay bebida). */
export const desechablesDisponibles = (tieneBebida) => DESECHABLES.filter(d => !d.soloConBebida || tieneBebida);

/** Lo que se envía al servidor: pone en 0 los que no aplican. */
export const desechablesParaEnviar = (cant, tieneBebida) =>
  Object.fromEntries(DESECHABLES.map(d => [d.key, desechablesDisponibles(tieneBebida).includes(d) ? cant[d.key] || 0 : 0]));

/** Costo de los desechables elegidos (sólo para mostrar; el servidor calcula el real). */
export const costoDesechables = (cant) => DESECHABLES.reduce((a, d) => a + d.precio * (cant[d.key] || 0), 0);
