const express = require('express');
const ExcelJS = require('exceljs');
const Order = require('../models/OrderModel');
const Gasto = require('../models/GastoModel');
const Cierre = require('../models/CierreModel');
const Counter = require('../models/CounterModel');
const { requireAuth, ROLES } = require('../middleware/auth');
const { cleanText, isObjectId, HttpError } = require('../lib/util');
const events = require('../lib/events');
const diasCerrados = require('../lib/diasCerrados');
const mongoose = require('mongoose');
const { escribirRespaldo } = require('../lib/respaldo');
const { diaBogota, sumarDias } = require('../lib/fechas');

const router = express.Router();
const CAJA = requireAuth(ROLES.ADMIN, ROLES.CAJERO);
const ADMIN = requireAuth(ROLES.ADMIN);

// Órdenes antiguas guardaban "Efectivo/QR"; se cuentan como efectivo
const normalizarMetodo = (m) => (!m || m === 'Efectivo/QR' ? 'Efectivo' : m);

/** Calcula el balance a partir de una lista de órdenes y gastos. */
const calcularBalance = (ordenes, gastos) => {
    const validas = ordenes.filter(o => o.estado !== 'Cancelado');
    const ventasPorMetodo = {};
    for (const o of validas) {
        const m = normalizarMetodo(o.cliente?.metodoPago);
        ventasPorMetodo[m] = (ventasPorMetodo[m] || 0) + (o.total || 0);
    }
    const totalVentas = validas.reduce((acc, o) => acc + (o.total || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
    const efectivoVentas = ventasPorMetodo.Efectivo || 0;
    return {
        totalVentas,
        totalGastos,
        efectivoVentas,
        totalCaja: efectivoVentas - totalGastos, // Efectivo que debería haber en el cajón
        ventasPorMetodo,
        cantidadPedidos: validas.length,
        cancelados: ordenes.length - validas.length,
        pendientes: ordenes.filter(o => ['Pendiente', 'Preparando', 'Listo'].includes(o.estado)).length,
        ticketPromedio: validas.length ? Math.round(totalVentas / validas.length) : 0
    };
};

const CAMPOS_BALANCE = 'total estado cliente.metodoPago fecha';

// --- GASTOS ---
router.post('/gastos', CAJA, async (req, res) => {
    const descripcion = cleanText(req.body?.descripcion, 120);
    const monto = Math.round(Number(req.body?.monto));
    if (!descripcion) throw new HttpError(400, 'La descripción es obligatoria');
    if (!Number.isFinite(monto) || monto <= 0) throw new HttpError(400, 'Monto inválido');

    const nuevo = await Gasto.create({ descripcion, monto, usuario: req.user.nombre || req.user.role });
    events.publish('caja:actualizada');
    res.status(201).json(nuevo);
});

router.get('/gastos/hoy', CAJA, async (req, res) => {
    res.json(await Gasto.find({ cierre_id: null }).sort({ fecha: -1 }).lean());
});

router.delete('/gastos/:id', CAJA, async (req, res) => {
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');
    const borrado = await Gasto.findOneAndDelete({ _id: req.params.id, cierre_id: null });
    if (!borrado) throw new HttpError(404, 'Gasto no encontrado o ya cerrado en caja');
    events.publish('caja:actualizada');
    res.json({ message: 'Eliminado' });
});

// --- DÍAS CERRADOS (no se reciben pedidos web) ---
router.get('/dias-cerrados', CAJA, async (req, res) => {
    res.json(await diasCerrados.listar());
});

router.post('/dias-cerrados', CAJA, async (req, res) => {
    const dia = String(req.body?.dia || '');
    const hoy = diaBogota();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(new Date(dia).getTime())) throw new HttpError(400, 'Fecha inválida');
    if (dia < hoy || dia > sumarDias(hoy, 366)) throw new HttpError(400, 'La fecha debe ser de hoy en adelante (máximo un año)');
    const lista = await diasCerrados.agregar(dia, cleanText(req.body?.motivo, 60) || 'Cerrado');
    events.publish('horario:actualizado');
    res.status(201).json(lista);
});

router.delete('/dias-cerrados/:dia', CAJA, async (req, res) => {
    const lista = await diasCerrados.quitar(String(req.params.dia));
    events.publish('horario:actualizado');
    res.json(lista);
});

// --- RESUMEN EN TIEMPO REAL ---
router.get('/ventas/hoy', CAJA, async (req, res) => {
    const [ordenes, gastos] = await Promise.all([
        Order.find({ cierre_id: null }).select(CAMPOS_BALANCE).lean(),
        Gasto.find({ cierre_id: null }).select('monto').lean()
    ]);
    res.json(calcularBalance(ordenes, gastos));
});

// --- CERRAR CAJA ---
let cerrando = false; // Evita dos cierres simultáneos (una sola instancia)
router.post('/ventas/cerrar', CAJA, async (req, res) => {
    const efectivoReal = Math.round(Number(req.body?.efectivoReal));
    if (!Number.isFinite(efectivoReal) || efectivoReal < 0) throw new HttpError(400, 'Efectivo inválido');
    if (cerrando) throw new HttpError(409, 'Ya hay un cierre en proceso');

    cerrando = true;
    try {
        // Foto fija del turno: sólo se cierran EXACTAMENTE las órdenes que se sumaron.
        // Una orden que entre durante el cierre queda para el siguiente turno.
        const [ordenes, gastos] = await Promise.all([
            Order.find({ cierre_id: null }).select(CAMPOS_BALANCE).lean(),
            Gasto.find({ cierre_id: null }).select('monto fecha').lean()
        ]);
        if (ordenes.length === 0 && gastos.length === 0) throw new HttpError(400, 'Nada para cerrar');

        const b = calcularBalance(ordenes, gastos);
        const fechas = [...ordenes, ...gastos].map(x => new Date(x.fecha).getTime());

        const cierre = await Cierre.create({
            fechaInicio: new Date(Math.min(...fechas)),
            totalVentasSistema: b.totalVentas,
            totalGastos: b.totalGastos,
            totalCajaTeorico: b.totalCaja,
            ventasPorMetodo: b.ventasPorMetodo,
            totalEfectivoReal: efectivoReal,
            diferencia: efectivoReal - b.totalCaja,
            cantidadPedidos: b.cantidadPedidos,
            cantidadCancelados: b.cancelados,
            usuario: req.user.nombre || req.user.role
        });

        await Promise.all([
            Order.updateMany({ _id: { $in: ordenes.map(o => o._id) } }, { $set: { cierre_id: cierre._id } }),
            Gasto.updateMany({ _id: { $in: gastos.map(g => g._id) } }, { $set: { cierre_id: cierre._id } }),
            Counter.reset('orden')
        ]);

        events.publish('caja:cerrada');
        res.json({ message: 'Cierre exitoso', reporte: cierre });
    } finally {
        cerrando = false;
    }
});

// --- RESPALDO COMPLETO (admin) ---
router.get('/respaldo', ADMIN, async (req, res) => {
    res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="Respaldo_YahnHong_${diaBogota()}.json"`,
        'Cache-Control': 'no-store'
    });
    const write = (s) => (res.write(s) ? null : new Promise(r => res.once('drain', r)));
    await escribirRespaldo(mongoose.connection.db, write);
    res.end();
});

// --- HISTORIAL ---
router.get('/cierres', ADMIN, async (req, res) => {
    res.json(await Cierre.find().sort({ fechaFin: -1 }).limit(60).lean());
});

// --- EXCEL DETALLADO (MULTI-HOJA) ---
const fmtFecha = (d) => new Date(d).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
const MONEDA = '"$"#,##0';
const fechaCorta = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }); // AAAA-MM-DD

const addSheet = (wb, name, columns, rows) => {
    const ws = wb.addWorksheet(name);
    ws.columns = columns;
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC62828' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    return ws;
};

// Caja también descarga: el Excel es obligatorio al cerrar el turno
router.get('/ventas/excel/:id', CAJA, async (req, res) => {
    const { id } = req.params;
    let query;
    let cierre = null;
    if (id === 'actual') {
        query = { cierre_id: null };
    } else {
        if (!isObjectId(id)) throw new HttpError(400, 'ID inválido');
        cierre = await Cierre.findById(id).lean();
        if (!cierre) throw new HttpError(404, 'Cierre no encontrado');
        query = { cierre_id: id };
    }
    const fechaArchivo = fechaCorta(cierre ? cierre.fechaFin : new Date());
    const tituloArchivo = cierre ? `Cierre_${fechaArchivo}` : `Cierre_Parcial_${fechaArchivo}`;

    const [ordenes, gastos] = await Promise.all([
        Order.find(query).sort({ fecha: 1 }).lean(),
        Gasto.find(query).sort({ fecha: 1 }).lean()
    ]);
    const b = calcularBalance(ordenes, gastos);

    const wb = new ExcelJS.Workbook();

    const resumen = addSheet(wb, 'RESUMEN', [
        { header: 'CONCEPTO', key: 'c', width: 32 },
        { header: 'VALOR', key: 'v', width: 18 }
    ], [
        { c: 'TOTAL VENTAS', v: b.totalVentas },
        ...Object.entries(b.ventasPorMetodo).map(([m, v]) => ({ c: `   Ventas ${m}`, v })),
        { c: 'TOTAL GASTOS (efectivo)', v: b.totalGastos },
        { c: 'EFECTIVO ESPERADO EN CAJA', v: b.totalCaja },
        ...(cierre ? [
            { c: 'EFECTIVO CONTADO', v: cierre.totalEfectivoReal },
            { c: cierre.diferencia === 0 ? 'DIFERENCIA (cuadra)' : cierre.diferencia > 0 ? 'SOBRANTE' : 'FALTANTE', v: Math.abs(cierre.diferencia) },
            { c: 'Inicio del turno', v: fmtFecha(cierre.fechaInicio) },
            { c: 'Cierre del turno', v: fmtFecha(cierre.fechaFin) },
            { c: 'Cerró', v: cierre.usuario }
        ] : [{ c: 'Estado', v: 'TURNO ABIERTO (parcial)' }]),
        { c: '' },
        { c: 'Cantidad pedidos', v: b.cantidadPedidos },
        { c: 'Pedidos anulados', v: b.cancelados },
        { c: 'Ticket promedio', v: b.ticketPromedio },
        { c: 'Cantidad gastos', v: gastos.length },
        { c: 'Fecha reporte', v: fmtFecha(new Date()) }
    ]);
    // Formato moneda sólo en filas de dinero (no en cantidades)
    resumen.eachRow((row, n) => {
        const c = String(row.getCell(1).value || '');
        if (n > 1 && /^[A-ZÁÉÍÓÚ ]+(\(|$)/.test(c)) row.getCell(1).font = { bold: true };
        if (n > 1 && typeof row.getCell(2).value === 'number' && !/^(Cantidad|Pedidos)/.test(c)) row.getCell(2).numFmt = MONEDA;
    });

    const ventas = addSheet(wb, 'VENTAS', [
        { header: '#', key: 'numero', width: 6 },
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Tipo', key: 'tipo', width: 11 },
        { header: 'Origen', key: 'origen', width: 8 },
        { header: 'Programado', key: 'programado', width: 11 },
        { header: 'Cliente', key: 'cliente', width: 24 },
        { header: 'Método', key: 'metodo', width: 13 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Items', key: 'items', width: 50 },
        { header: 'Notas', key: 'nota', width: 30 },
        { header: 'Registró', key: 'usuario', width: 14 },
        { header: 'Anuló', key: 'anulo', width: 14 },
        { header: 'Total', key: 'total', width: 12 }
    ], ordenes.map(o => ({
        numero: o.numero ?? '',
        fecha: fmtFecha(o.fecha),
        tipo: o.tipo === 'Llevar' && o.origen === 'Web' ? 'Recoger' : o.tipo,
        origen: o.origen || 'POS',
        programado: o.horaProgramada ? new Date(o.horaProgramada).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }) : '',
        cliente: o.cliente?.nombre,
        metodo: normalizarMetodo(o.cliente?.metodoPago),
        estado: o.estado,
        items: o.items.map(i => `${i.cantidad}x ${i.nombre} (${i.tamaño})`).join(', '),
        nota: o.items.map(i => i.nota).filter(Boolean).join(' | '),
        usuario: o.usuario || '',
        anulo: o.anuladoPor || '',
        total: o.total
    })));
    ventas.getColumn('total').numFmt = MONEDA;

    // Productos vendidos (sin anuladas), de más a menos vendidos
    const porProducto = new Map();
    for (const o of ordenes.filter(x => x.estado !== 'Cancelado')) {
        for (const i of o.items) {
            const k = `${i.nombre} (${i.tamaño})`;
            const acc = porProducto.get(k) || { producto: k, cantidad: 0, total: 0 };
            acc.cantidad += i.cantidad; acc.total += i.cantidad * i.precio;
            porProducto.set(k, acc);
        }
    }
    const productos = addSheet(wb, 'PRODUCTOS', [
        { header: 'Producto', key: 'producto', width: 40 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Total', key: 'total', width: 14 }
    ], [...porProducto.values()].sort((a, b) => b.cantidad - a.cantidad));
    productos.getColumn('total').numFmt = MONEDA;

    const hojaGastos = addSheet(wb, 'GASTOS', [
        { header: 'Fecha', key: 'fecha', width: 20 },
        { header: 'Descripción', key: 'descripcion', width: 40 },
        { header: 'Usuario', key: 'usuario', width: 14 },
        { header: 'Monto', key: 'monto', width: 12 }
    ], gastos.map(g => ({ fecha: fmtFecha(g.fecha), descripcion: g.descripcion, usuario: g.usuario, monto: g.monto })));
    hojaGastos.getColumn('monto').numFmt = MONEDA;

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename=${tituloArchivo}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));
});

module.exports = router;
