const express = require('express');
const rateLimit = require('express-rate-limit');
const Order = require('../models/OrderModel');
const { METODOS_PAGO, validarPagos, pagosDe } = require('../lib/pagos');
const Product = require('../models/ProductModel');
const { TAMANOS } = require('../models/ProductModel');
const Counter = require('../models/CounterModel');
const { requireAuth, optionalAuth, ROLES, STAFF } = require('../middleware/auth');
const { cleanText, isObjectId, HttpError } = require('../lib/util');
const events = require('../lib/events');
const { buildDesechables, CATEGORIA_BEBIDAS } = require('../lib/desechables');
const { parseHoraProgramada, sumarDias, TZ } = require('../lib/fechas');
const horario = require('../lib/horario');
const diasCerrados = require('../lib/diasCerrados');
const { categoriasSoloPos } = require('../../shared/config.json');

const router = express.Router();

const ACTIVOS = ['Pendiente', 'Preparando', 'Listo'];
const CAJA = [ROLES.ADMIN, ROLES.CAJERO];
const PUEDEN_VENDER = [ROLES.ADMIN, ROLES.CAJERO, ROLES.MESERA];
const METODOS_WEB = ['Efectivo', 'Nequi'];
const TIPOS_WEB = ['Domicilio', 'Llevar']; // Llevar desde la web = "Recoger en el local"

// Pedidos web anónimos: máximo 8 cada 10 minutos por IP
const publicOrderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 8,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => Boolean(req.user) || process.env.NODE_ENV === 'test',
    message: { message: 'Demasiados pedidos seguidos. Intente de nuevo en unos minutos.' }
});

/**
 * Construye los ítems con los precios REALES de la base de datos.
 * El cliente sólo dice qué producto, tamaño y cantidad; nunca el precio.
 */
const buildItems = async (rawItems, { esStaff = false } = {}) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'El pedido está vacío');
    if (rawItems.length > 60) throw new HttpError(400, 'Demasiados ítems en un pedido');

    const ids = [...new Set(rawItems.map(i => Number(i.productoId)))];
    const productos = await Product.find({ id: { $in: ids } }).lean();
    const byId = new Map(productos.map(p => [p.id, p]));

    let total = 0;
    let tieneBebida = false;
    const items = rawItems.map(raw => {
        const p = byId.get(Number(raw.productoId));
        if (!p) throw new HttpError(400, 'Uno de los productos ya no existe. Actualice el menú.');
        if (p.disponible === false) throw new HttpError(409, `"${p.nombre}" está agotado`);
        if (!esStaff && categoriasSoloPos.includes(p.categoria)) throw new HttpError(400, `"${p.nombre}" no está disponible en la web`);

        const tamaño = String(raw.tamaño || '').toLowerCase();
        const precio = TAMANOS.includes(tamaño) ? p.precios?.[tamaño] : 0;
        if (!precio || precio <= 0) throw new HttpError(400, `Tamaño inválido para "${p.nombre}"`);

        const cantidad = Number(raw.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) throw new HttpError(400, 'Cantidad inválida');

        total += precio * cantidad;
        if (p.categoria === CATEGORIA_BEBIDAS) tieneBebida = true;
        return { productoId: p.id, nombre: p.nombre, cantidad, precio, tamaño, nota: cleanText(raw.nota, 200) };
    });
    return { items, total, tieneBebida };
};

const fmtHora = (d) => d.toLocaleTimeString('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const fmtDia = (d) => d.toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

/** Los pedidos web sólo se aceptan en horario de atención (o programados dentro del horario de hoy). */
const validarHorarioWeb = async (horaProgramada, ahora = new Date()) => {
    const { abierto, hoy, proxima } = horario.estado(ahora, await diasCerrados.obtener());
    if (hoy.cerrado) throw new HttpError(409, `Hoy no estamos recibiendo pedidos (${hoy.cerrado}). Abrimos el ${fmtDia(proxima.abre)} a las ${fmtHora(proxima.abre)}`);
    const rango = `${fmtHora(hoy.abre)} y ${fmtHora(hoy.cierra)}`;
    if (horaProgramada) {
        if (horaProgramada < hoy.abre || horaProgramada > hoy.cierra) throw new HttpError(400, `Solo se pueden programar pedidos entre ${rango}`);
        return;
    }
    if (!abierto) {
        const dia = proxima.dia === hoy.dia ? 'hoy' : proxima.dia === sumarDias(hoy.dia, 1) ? 'mañana' : `el ${fmtDia(proxima.abre)}`;
        throw new HttpError(409, `Estamos cerrados. Abrimos ${dia} a las ${fmtHora(proxima.abre)}`);
    }
};

// --- CREAR ORDEN (POS o Web) ---
router.post('/', optionalAuth, publicOrderLimiter, async (req, res) => {
    const body = req.body || {};
    const esStaff = req.user && PUEDEN_VENDER.includes(req.user.role);
    // La web pública sólo puede crear domicilios o pedidos para recoger
    const tipo = esStaff ? body.tipo : (TIPOS_WEB.includes(body.tipo) ? body.tipo : 'Domicilio');
    if (!['Mesa', 'Llevar', 'Domicilio'].includes(tipo)) throw new HttpError(400, 'Tipo de pedido inválido');

    const c = body.cliente || {};
    const metodoPago = (esStaff ? METODOS_PAGO : METODOS_WEB).includes(c.metodoPago) ? c.metodoPago : 'Efectivo';
    let numeroMesa = null;
    let cliente;

    if (tipo === 'Mesa') {
        numeroMesa = cleanText(String(body.numeroMesa ?? ''), 3);
        if (!/^\d{1,3}$/.test(numeroMesa) || Number(numeroMesa) < 1) throw new HttpError(400, 'Número de mesa inválido');
        cliente = { nombre: `Mesa ${numeroMesa}`, telefono: '', direccion: 'Local', metodoPago };
    } else if (tipo === 'Llevar') {
        cliente = { nombre: cleanText(c.nombre, 60) || 'Para llevar', telefono: cleanText(c.telefono, 20).replace(/[^\d+ ]/g, ''), direccion: 'Local', metodoPago };
        if (!esStaff) {
            if (!cleanText(c.nombre, 60)) throw new HttpError(400, 'El nombre es obligatorio');
            if (cliente.telefono.replace(/\D/g, '').length < 7) throw new HttpError(400, 'Teléfono inválido');
        }
    } else {
        cliente = {
            nombre: cleanText(c.nombre, 60),
            telefono: cleanText(c.telefono, 20).replace(/[^\d+ ]/g, ''),
            direccion: cleanText(c.direccion, 150),
            metodoPago
        };
        if (!cliente.nombre || !cliente.direccion) throw new HttpError(400, 'Nombre y dirección son obligatorios');
        if (cliente.telefono.replace(/\D/g, '').length < 7) throw new HttpError(400, 'Teléfono inválido');
    }

    const horaProgramada = tipo === 'Mesa' ? null : parseHoraProgramada(body.horaProgramada);
    if (!esStaff) await validarHorarioWeb(horaProgramada);

    const { items: productos, total: totalProductos, tieneBebida } = await buildItems(body.items, { esStaff });
    const extras = buildDesechables(body.desechables, HttpError, { tieneBebida });
    const items = [...productos, ...extras];
    const total = totalProductos + extras.reduce((a, i) => a + i.precio * i.cantidad, 0);

    // Pago dividido (solo POS): las partes deben sumar el total calculado aquí
    const pagos = esStaff && body.pagos ? validarPagos(body.pagos, total) : null;
    if (pagos) cliente.metodoPago = 'Mixto';

    const numero = await Counter.next('orden');
    const orden = await Order.create({
        tipo, numeroMesa, cliente, items, total, numero, horaProgramada, ...(pagos ? { pagos } : {}),
        origen: esStaff ? 'POS' : 'Web',
        usuario: esStaff ? req.user.nombre || req.user.role : 'Web'
    });

    events.publish('orden:nueva', orden);
    res.status(201).json(orden);
});

// --- ÓRDENES ACTIVAS (cocina / POS para ver mesas ocupadas) ---
router.get('/', requireAuth(...STAFF), async (req, res) => {
    const ordenes = await Order.find({ estado: { $in: ACTIVOS }, cierre_id: null }).sort({ fecha: 1 }).lean();
    res.json(ordenes);
});

// --- TODAS LAS ÓRDENES DEL TURNO (caja) ---
router.get('/turno', requireAuth(...CAJA), async (req, res) => {
    const ordenes = await Order.find({ cierre_id: null }).sort({ fecha: -1 }).limit(500).lean();
    res.json(ordenes);
});

// --- ADICIONAR PRODUCTOS A UNA ORDEN YA ENVIADA (POS) ---
// La orden vuelve a cocina si ya estaba Lista o Entregada; los ítems nuevos quedan marcados (agregadoEn).
router.post('/:id/items', requireAuth(...PUEDEN_VENDER), async (req, res) => {
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');
    const actual = await Order.findOne({ _id: req.params.id, cierre_id: null }).lean();
    if (!actual) throw new HttpError(404, 'Orden no encontrada o ya cerrada en caja');
    if (actual.estado === 'Cancelado') throw new HttpError(409, 'La orden está anulada');

    const { items: nuevos, total: totalNuevos, tieneBebida } = await buildItems(req.body?.items, { esStaff: true });
    // Vasos: valen si la orden ya tenía una bebida o si viene una en la adición
    const idsPrevios = actual.items.filter(i => !i.extra && i.productoId != null).map(i => i.productoId);
    const hayBebida = tieneBebida || Boolean(idsPrevios.length && await Product.exists({ id: { $in: idsPrevios }, categoria: CATEGORIA_BEBIDAS }));
    const extras = buildDesechables(req.body?.desechables, HttpError, { tieneBebida: hayBebida });
    const ahora = new Date();
    const agregados = [...nuevos, ...extras].map(i => ({ ...i, agregadoEn: ahora }));
    const suma = totalNuevos + extras.reduce((a, i) => a + i.precio * i.cantidad, 0);

    const set = {
        total: actual.total + suma,
        estado: ['Listo', 'Completado'].includes(actual.estado) ? 'Pendiente' : actual.estado
    };
    const cambios = { $push: { items: { $each: agregados } }, $set: set };
    // Un pago dividido ya no cuadra con el nuevo total: queda el método de mayor valor y caja lo ajusta
    let pagoReiniciado = false;
    if (actual.pagos?.length) {
        const mayor = pagosDe(actual).sort((a, b) => b.monto - a.monto)[0];
        set['cliente.metodoPago'] = mayor.metodo;
        cambios.$unset = { pagos: 1 };
        pagoReiniciado = true;
    }

    // Filtro por total: si otra persona adicionó al mismo tiempo, no se pisan los cambios
    const orden = await Order.findOneAndUpdate(
        { _id: actual._id, cierre_id: null, total: actual.total, estado: { $ne: 'Cancelado' } },
        cambios,
        { returnDocument: 'after' }
    );
    if (!orden) throw new HttpError(409, 'La orden cambió mientras se adicionaba. Intente de nuevo.');

    events.publish('orden:agregado', { orden, agregados, por: req.user.nombre || req.user.role });
    res.json({ orden, agregados, pagoReiniciado });
});

// --- CAMBIO DE ESTADO (flujo de cocina) ---
router.patch('/:id/estado', requireAuth(...STAFF), async (req, res) => {
    const { estado } = req.body || {};
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');
    if (![...ACTIVOS, 'Completado', 'Cancelado'].includes(estado)) throw new HttpError(400, 'Estado inválido');
    if (estado === 'Cancelado' && !CAJA.includes(req.user.role)) throw new HttpError(403, 'Sólo caja puede anular órdenes');

    const cambios = estado === 'Cancelado'
        ? { estado, anuladoPor: req.user.nombre || req.user.role, anuladoEn: new Date() }
        : { estado, anuladoPor: null, anuladoEn: null };
    const orden = await Order.findOneAndUpdate(
        { _id: req.params.id, cierre_id: null },
        cambios,
        { returnDocument: 'after' }
    );
    if (!orden) throw new HttpError(404, 'Orden no encontrada o ya cerrada en caja');

    events.publish('orden:actualizada', orden);
    res.json(orden);
});

// --- CORREGIR MÉTODO DE PAGO (caja): un método o pago dividido { pagos: [{ metodo, monto }] } ---
router.patch('/:id/pago', requireAuth(...CAJA), async (req, res) => {
    const { metodoPago, pagos: rawPagos } = req.body || {};
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');

    let cambios;
    if (rawPagos !== undefined) {
        const actual = await Order.findOne({ _id: req.params.id, cierre_id: null }).select('total').lean();
        if (!actual) throw new HttpError(404, 'Orden no encontrada o ya cerrada en caja');
        const pagos = validarPagos(rawPagos, actual.total);
        cambios = pagos
            ? { $set: { pagos, 'cliente.metodoPago': 'Mixto' } }
            : { $set: { 'cliente.metodoPago': rawPagos[0].metodo }, $unset: { pagos: 1 } };
    } else {
        if (!METODOS_PAGO.includes(metodoPago)) throw new HttpError(400, 'Método de pago inválido');
        cambios = { $set: { 'cliente.metodoPago': metodoPago }, $unset: { pagos: 1 } };
    }

    const orden = await Order.findOneAndUpdate(
        { _id: req.params.id, cierre_id: null },
        cambios,
        { returnDocument: 'after' }
    );
    if (!orden) throw new HttpError(404, 'Orden no encontrada o ya cerrada en caja');

    events.publish('orden:actualizada', orden);
    res.json(orden);
});

module.exports = router;
