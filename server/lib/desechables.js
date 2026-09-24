/**
 * Desechables que se pueden agregar a cualquier pedido.
 * El precio y los límites se validan SIEMPRE aquí (el cliente sólo envía cantidades).
 * Se configuran en shared/config.json (lo usan también las pantallas del cliente).
 */
const config = require('../../shared/config.json');

const DESECHABLES = Object.fromEntries(config.desechables.map(d => [d.key, {
    nombre: d.item, precio: d.precio, max: d.max, soloConBebida: Boolean(d.soloConBebida)
}]));

const CATEGORIA_BEBIDAS = config.categoriaBebidas;

/** Convierte { cucharas, platos } en ítems de la orden. Lanza si excede los límites. */
const buildDesechables = (raw = {}, HttpError, { tieneBebida = false } = {}) => {
    const items = [];
    for (const [key, cfg] of Object.entries(DESECHABLES)) {
        const cantidad = raw?.[key] === undefined || raw?.[key] === null || raw?.[key] === '' ? 0 : Number(raw[key]);
        if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > cfg.max) {
            throw new HttpError(400, `Máximo ${cfg.max} ${key}`);
        }
        if (cantidad > 0 && cfg.soloConBebida && !tieneBebida) {
            throw new HttpError(400, 'Los vasos sólo se agregan si el pedido tiene una bebida');
        }
        if (cantidad > 0) {
            items.push({ productoId: null, nombre: cfg.nombre, cantidad, precio: cfg.precio, tamaño: 'unico', nota: '', extra: true });
        }
    }
    return items;
};

module.exports = { DESECHABLES, CATEGORIA_BEBIDAS, buildDesechables };
