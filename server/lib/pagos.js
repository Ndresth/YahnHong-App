const { HttpError } = require('./util');

const METODOS_PAGO = ['Efectivo', 'Nequi', 'Transferencia', 'Tarjeta'];
const MAX_PARTES = 4;

// Órdenes antiguas guardaban "Efectivo/QR" o nada; se cuentan como efectivo
const normalizarMetodo = (m) => (!m || m === 'Efectivo/QR' ? 'Efectivo' : m);

/**
 * Pagos de una orden como [{ metodo, monto }].
 * Pago dividido: o.pagos. Pago único: todo el total con cliente.metodoPago.
 */
const pagosDe = (o) => (Array.isArray(o.pagos) && o.pagos.length
    ? o.pagos.map(p => ({ metodo: normalizarMetodo(p.metodo), monto: p.monto || 0 }))
    : [{ metodo: normalizarMetodo(o.cliente?.metodoPago), monto: o.total || 0 }]);

/**
 * Valida un pago dividido contra el total de la orden.
 * Devuelve [{ metodo, monto }] (métodos repetidos se suman) o lanza 400.
 */
const validarPagos = (raw, total) => {
    if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_PARTES) {
        throw new HttpError(400, `Un pago dividido debe tener entre 2 y ${MAX_PARTES} partes`);
    }
    const porMetodo = new Map();
    for (const p of raw) {
        const monto = Number(p?.monto);
        if (!METODOS_PAGO.includes(p?.metodo)) throw new HttpError(400, 'Método de pago inválido');
        if (!Number.isInteger(monto) || monto <= 0) throw new HttpError(400, 'Cada parte del pago debe ser un valor mayor a 0');
        porMetodo.set(p.metodo, (porMetodo.get(p.metodo) || 0) + monto);
    }
    const pagos = [...porMetodo].map(([metodo, monto]) => ({ metodo, monto }));
    const suma = pagos.reduce((a, p) => a + p.monto, 0);
    if (suma !== total) throw new HttpError(400, `Las partes suman $${suma.toLocaleString('es-CO')} y el total es $${total.toLocaleString('es-CO')}`);
    // Si al sumar repetidos queda un solo método, no es pago dividido
    return pagos.length > 1 ? pagos : null;
};

/** "Efectivo $20.000 + Nequi $30.000" o "Nequi". */
const textoPago = (o) => {
    const pagos = pagosDe(o);
    return pagos.length > 1 ? pagos.map(p => `${p.metodo} $${p.monto.toLocaleString('es-CO')}`).join(' + ') : pagos[0].metodo;
};

module.exports = { METODOS_PAGO, MAX_PARTES, normalizarMetodo, pagosDe, validarPagos, textoPago };
