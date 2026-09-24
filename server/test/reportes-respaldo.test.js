const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { crearApp, servir, token } = require('./helpers');
const Order = require('../models/OrderModel');
const Gasto = require('../models/GastoModel');
const { escribirRespaldo, restaurar } = require('../lib/respaldo');

// Forma real de la agregación (validada contra Atlas)
Order.aggregate = async () => [{
    dias: [
        { _id: { dia: '2026-09-23', metodo: 'Nequi' }, ventas: 54200, pedidos: 1 },
        { _id: { dia: '2026-09-23', metodo: 'Efectivo' }, ventas: 103000, pedidos: 3 },
        { _id: { dia: '2026-09-21', metodo: 'Efectivo/QR' }, ventas: 1000, pedidos: 1 },
        { _id: { dia: '2026-09-19', metodo: 'Nequi' }, ventas: 32000, pedidos: 1 } // fuera del rango
    ],
    cancelados: [{ _id: '2026-09-22', n: 1 }],
    tipos: [{ _id: { tipo: 'Llevar', origen: 'Web' }, ventas: 100, pedidos: 1 }],
    horas: [{ _id: 12, ventas: 100, pedidos: 1 }],
    productos: [{ _id: { nombre: 'Arroz Paisa', tamaño: 'familiar' }, cantidad: 2, ventas: 100000 }]
}];
Gasto.aggregate = async () => [{ _id: '2026-09-23', monto: 6000, n: 1 }];

test('reportes', async (t) => {
    const api = await servir(crearApp({ '/api/reportes': require('../routes/reportes') }));
    t.after(api.cerrar);
    const admin = token({ role: 'admin', nombre: 'Admin' });

    const [st, r] = await api.get('/api/reportes?desde=2026-09-21&hasta=2026-09-27', { token: admin });
    assert.equal(st, 200);
    assert.equal(r.dias.length, 7); // un registro por día aunque no haya ventas
    assert.deepEqual(r.resumen, {
        ventas: 158200, pedidos: 5, gastos: 6000, neto: 152200, ticketPromedio: 31640, cancelados: 1,
        ventasPorMetodo: { Nequi: 54200, Efectivo: 104000 } // "Efectivo/QR" cuenta como efectivo
    });
    assert.equal(r.tipos[0].tipo, 'Llevar');

    assert.equal((await api.get('/api/reportes?desde=2026-09-21&hasta=2026-09-27', { token: token({ role: 'cajero' }) }))[0], 403);
    assert.equal((await api.get('/api/reportes?desde=x&hasta=2026-09-27', { token: admin }))[0], 400);
});

/** Colección falsa en memoria con la misma interfaz que usa lib/respaldo.js */
const dbFalsa = (datos) => ({
    collection: (nombre) => ({
        find: () => (datos[nombre] || [])[Symbol.iterator](),
        deleteMany: async () => { datos[nombre] = []; },
        bulkWrite: async (ops) => {
            datos[nombre] = datos[nombre] || [];
            for (const { replaceOne: { filter, replacement } } of ops) {
                const i = datos[nombre].findIndex(d => String(d._id) === String(filter._id));
                if (i >= 0) datos[nombre][i] = replacement; else datos[nombre].push(replacement);
            }
        }
    })
});

test('respaldo y restauración conservan fechas y ObjectId', async () => {
    const id = new mongoose.Types.ObjectId();
    const origen = { orders: [{ _id: id, fecha: new Date('2026-09-23T17:00:00Z'), total: 50000 }], products: [{ _id: 'p1', id: 1 }] };
    let texto = '';
    const conteo = await escribirRespaldo(dbFalsa(origen), (s) => { texto += s; });
    assert.equal(conteo.orders, 1);
    assert.equal(conteo.usuarios, 0);

    const destino = { orders: [{ _id: id, fecha: new Date(0), total: 1 }], products: [{ _id: 'otro' }] };
    const r = await restaurar(dbFalsa(destino), texto);
    assert.equal(r.resultado.orders, 1);
    assert.equal(destino.orders.length, 1); // reemplazó por _id
    assert.ok(destino.orders[0].fecha instanceof Date);
    assert.ok(destino.orders[0]._id instanceof mongoose.Types.ObjectId);
    assert.equal(destino.orders[0].total, 50000);
    assert.equal(destino.products.length, 2); // sin --reemplazar no borra lo demás

    const destino2 = { products: [{ _id: 'otro' }] };
    await restaurar(dbFalsa(destino2), texto, { reemplazar: true });
    assert.deepEqual(destino2.products, [{ _id: 'p1', id: 1 }]);

    await assert.rejects(restaurar(dbFalsa({}), '{"hola":1}'), /inválido/);
});
