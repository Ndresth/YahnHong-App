const express = require('express');
const Order = require('../models/OrderModel');
const Gasto = require('../models/GastoModel');
const { requireAuth, ROLES } = require('../middleware/auth');
const { TZ, rangoDias, sumarDias } = require('../lib/fechas');

const router = express.Router();
const ADMIN = requireAuth(ROLES.ADMIN);

// Las órdenes siguen en la BD después del cierre de caja (sólo se marcan con cierre_id),
// así que los reportes se calculan por FECHA de la orden, sin importar el turno.
const DIA = { $dateToString: { format: '%Y-%m-%d', date: '$fecha', timezone: TZ } };
const VALIDA = { estado: { $ne: 'Cancelado' } };
const TOTAL = { $ifNull: ['$total', 0] };

// Órdenes antiguas guardaban "Efectivo/QR" o nada; se cuentan como efectivo
const normalizarMetodo = (m) => (!m || m === 'Efectivo/QR' ? 'Efectivo' : m);

/**
 * GET /api/reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD  (inclusive, hora de Colombia)
 * Resumen del periodo + desglose por día, método de pago, tipo, hora y producto.
 */
router.get('/', ADMIN, async (req, res) => {
    const { desde, hasta } = req.query;
    const { ini, fin } = rangoDias(desde, hasta);
    const enRango = { fecha: { $gte: ini, $lt: fin } };

    const [[f], gastosDia] = await Promise.all([
        Order.aggregate([
            { $match: enRango },
            {
                $facet: {
                    dias: [
                        { $match: VALIDA },
                        { $group: { _id: { dia: DIA, metodo: '$cliente.metodoPago' }, ventas: { $sum: TOTAL }, pedidos: { $sum: 1 } } }
                    ],
                    cancelados: [
                        { $match: { estado: 'Cancelado' } },
                        { $group: { _id: DIA, n: { $sum: 1 } } }
                    ],
                    tipos: [
                        { $match: VALIDA },
                        { $group: { _id: { tipo: '$tipo', origen: { $ifNull: ['$origen', 'POS'] } }, ventas: { $sum: TOTAL }, pedidos: { $sum: 1 } } },
                        { $sort: { ventas: -1 } }
                    ],
                    horas: [
                        { $match: VALIDA },
                        { $group: { _id: { $hour: { date: '$fecha', timezone: TZ } }, ventas: { $sum: TOTAL }, pedidos: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ],
                    productos: [
                        { $match: VALIDA },
                        { $unwind: '$items' },
                        { $match: { 'items.extra': { $ne: true } } },
                        {
                            $group: {
                                _id: { nombre: '$items.nombre', tamaño: '$items.tamaño' },
                                cantidad: { $sum: '$items.cantidad' },
                                ventas: { $sum: { $multiply: ['$items.precio', '$items.cantidad'] } }
                            }
                        },
                        { $sort: { ventas: -1 } },
                        { $limit: 30 }
                    ]
                }
            }
        ]),
        Gasto.aggregate([
            { $match: enRango },
            { $group: { _id: DIA, monto: { $sum: '$monto' }, n: { $sum: 1 } } }
        ])
    ]);

    // Un registro por día del rango, aunque no haya ventas (para las gráficas)
    const porDia = new Map();
    for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
        porDia.set(d, { dia: d, ventas: 0, pedidos: 0, porMetodo: {}, gastos: 0, cancelados: 0 });
    }
    const ventasPorMetodo = {};
    for (const r of f.dias) {
        const d = porDia.get(r._id.dia);
        if (!d) continue;
        const m = normalizarMetodo(r._id.metodo);
        d.ventas += r.ventas;
        d.pedidos += r.pedidos;
        d.porMetodo[m] = (d.porMetodo[m] || 0) + r.ventas;
        ventasPorMetodo[m] = (ventasPorMetodo[m] || 0) + r.ventas;
    }
    for (const r of f.cancelados) if (porDia.has(r._id)) porDia.get(r._id).cancelados = r.n;
    for (const r of gastosDia) if (porDia.has(r._id)) porDia.get(r._id).gastos = r.monto;

    const dias = [...porDia.values()];
    const suma = (k) => dias.reduce((a, d) => a + d[k], 0);
    const ventas = suma('ventas');
    const pedidos = suma('pedidos');
    const gastos = suma('gastos');

    res.json({
        desde, hasta,
        resumen: {
            ventas, pedidos, gastos,
            neto: ventas - gastos,
            ticketPromedio: pedidos ? Math.round(ventas / pedidos) : 0,
            cancelados: suma('cancelados'),
            ventasPorMetodo
        },
        dias,
        tipos: f.tipos.map(t => ({ tipo: t._id.tipo, origen: t._id.origen, ventas: t.ventas, pedidos: t.pedidos })),
        horas: f.horas.map(h => ({ hora: h._id, ventas: h.ventas, pedidos: h.pedidos })),
        productos: f.productos.map(p => ({ nombre: p._id.nombre, tamaño: p._id.tamaño, cantidad: p.cantidad, ventas: p.ventas }))
    });
});

/** GET /api/reportes/dia/AAAA-MM-DD — órdenes y gastos de un día, para el detalle. */
router.get('/dia/:dia', ADMIN, async (req, res) => {
    const { ini, fin } = rangoDias(req.params.dia, req.params.dia);
    const enRango = { fecha: { $gte: ini, $lt: fin } };
    const [ordenes, gastos] = await Promise.all([
        Order.find(enRango).sort({ fecha: 1 }).limit(1000)
            .select('numero fecha tipo numeroMesa origen horaProgramada cliente.nombre cliente.metodoPago items.nombre items.cantidad items.tamaño items.extra total estado usuario')
            .lean(),
        Gasto.find(enRango).sort({ fecha: 1 }).select('descripcion monto fecha usuario').lean()
    ]);
    res.json({ ordenes, gastos });
});

module.exports = router;
