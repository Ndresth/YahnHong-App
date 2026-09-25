const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token } = require('./helpers');
const { validarPagos, pagosDe, textoPago } = require('../lib/pagos');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const Counter = require('../models/CounterModel');

test('validarPagos: partes, métodos y suma exacta', () => {
    assert.deepEqual(validarPagos([{ metodo: 'Efectivo', monto: 20000 }, { metodo: 'Nequi', monto: 30000 }], 50000),
        [{ metodo: 'Efectivo', monto: 20000 }, { metodo: 'Nequi', monto: 30000 }]);
    assert.throws(() => validarPagos([{ metodo: 'Efectivo', monto: 20000 }, { metodo: 'Nequi', monto: 20000 }], 50000), /suman \$40\.000/);
    assert.throws(() => validarPagos([{ metodo: 'Efectivo', monto: 50000 }], 50000), /entre 2/);
    assert.throws(() => validarPagos([{ metodo: 'Bitcoin', monto: 1 }, { metodo: 'Nequi', monto: 1 }], 2), /inválido/);
    assert.throws(() => validarPagos([{ metodo: 'Nequi', monto: 0 }, { metodo: 'Efectivo', monto: 5 }], 5), /mayor a 0/);
    // Mismo método repetido se suma; si queda uno solo, no es pago dividido
    assert.equal(validarPagos([{ metodo: 'Nequi', monto: 1 }, { metodo: 'Nequi', monto: 2 }], 3), null);
});

test('pagosDe y textoPago', () => {
    assert.deepEqual(pagosDe({ total: 5000, cliente: { metodoPago: 'Efectivo/QR' } }), [{ metodo: 'Efectivo', monto: 5000 }]);
    const mixta = { total: 50000, pagos: [{ metodo: 'Nequi', monto: 30000 }, { metodo: 'Transferencia', monto: 20000 }] };
    assert.equal(textoPago(mixta), 'Nequi $30.000 + Transferencia $20.000');
});

// BD simulada
const PRODUCTOS = [
    { id: 1, nombre: 'Arroz Paisa', categoria: 'Arroz Frito', precios: { familiar: 50000 } },
    { id: 75, nombre: 'Coca Cola 1.5', categoria: 'Bebidas', precios: { unico: 9000 } },
    { id: 85, nombre: 'C1', categoria: 'Cajas', precios: { unico: 500 } }
];
Product.find = (q) => ({ lean: async () => PRODUCTOS.filter(p => q.id.$in.includes(p.id)) });
Product.exists = async (q) => PRODUCTOS.some(p => q.id.$in.includes(p.id) && p.categoria === q.categoria);
Counter.next = async () => 1;
Order.create = async (o) => ({ _id: 'x', ...o });
let orden = null;
let ultimoUpdate = null;
Order.findOne = () => ({ lean: async () => orden, select: () => ({ lean: async () => orden }) });
Order.findOneAndUpdate = async (filtro, cambios) => {
    ultimoUpdate = { filtro, cambios };
    if (filtro.total !== undefined && filtro.total !== orden.total) return null;
    const nueva = structuredClone(orden);
    if (cambios.$push) nueva.items.push(...cambios.$push.items.$each);
    for (const [k, v] of Object.entries(cambios.$set || {})) {
        if (k === 'cliente.metodoPago') nueva.cliente.metodoPago = v; else nueva[k] = v;
    }
    if (cambios.$unset?.pagos) delete nueva.pagos;
    return nueva;
};

test('rutas', async (t) => {
    const api = await servir(crearApp({ '/api/orders': require('../routes/orders') }));
    t.after(api.cerrar);
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-23T17:00:00Z') }); // mié 12 m. (abierto)
    const mesera = token({ role: 'mesera', nombre: 'Luz' });
    const cajero = token({ role: 'cajero', nombre: 'Pedro' });
    const id = '507f1f77bcf86cd799439011';

    await t.test('POS: pago dividido al crear; debe cuadrar con el total del servidor', async () => {
        const body = { tipo: 'Mesa', numeroMesa: '3', items: [{ productoId: 1, tamaño: 'familiar', cantidad: 1 }] };
        const [st, o] = await api.post('/api/orders', { token: mesera, body: { ...body, pagos: [{ metodo: 'Efectivo', monto: 20000 }, { metodo: 'Nequi', monto: 30000 }] } });
        assert.equal(st, 201);
        assert.equal(o.cliente.metodoPago, 'Mixto');
        assert.equal(o.pagos.length, 2);
        assert.equal((await api.post('/api/orders', { token: mesera, body: { ...body, pagos: [{ metodo: 'Efectivo', monto: 1 }, { metodo: 'Nequi', monto: 1 }] } }))[0], 400);
    });

    await t.test('Cajas: se venden en el POS pero no en la web', async () => {
        const items = [{ productoId: 85, tamaño: 'unico', cantidad: 2 }];
        const [st] = await api.post('/api/orders', { token: mesera, body: { tipo: 'Llevar', items } });
        assert.equal(st, 201);
        const [stWeb, e] = await api.post('/api/orders', { body: { tipo: 'Domicilio', cliente: { nombre: 'Ana', telefono: '3001234567', direccion: 'Cl 1' }, items } });
        assert.equal(stWeb, 400);
        assert.match(e.message, /no está disponible en la web/);
    });

    await t.test('adicionar a una orden en cocina: suma total, marca ítems y la devuelve a cocina', async () => {
        orden = { _id: id, estado: 'Listo', total: 50000, cliente: { metodoPago: 'Efectivo' }, items: [{ productoId: 1, nombre: 'Arroz Paisa', cantidad: 1, precio: 50000 }] };
        const [st, r] = await api.post(`/api/orders/${id}/items`, { token: mesera, body: { items: [{ productoId: 75, tamaño: 'unico', cantidad: 2 }], desechables: { vasos: 2 } } });
        assert.equal(st, 200);
        assert.equal(r.orden.total, 50000 + 18000);
        assert.equal(r.orden.estado, 'Pendiente');
        assert.equal(r.agregados.length, 2); // Coca Cola + vasos
        assert.ok(r.agregados.every(i => i.agregadoEn));
        assert.equal(ultimoUpdate.filtro.total, 50000); // no pisa adiciones simultáneas
    });

    await t.test('adicionar: vasos valen si la orden ya tenía bebida; no se puede a anuladas', async () => {
        orden = { _id: id, estado: 'Preparando', total: 9000, cliente: { metodoPago: 'Nequi' }, items: [{ productoId: 75, nombre: 'Coca Cola 1.5', cantidad: 1, precio: 9000 }] };
        const [st, r] = await api.post(`/api/orders/${id}/items`, { token: mesera, body: { items: [{ productoId: 1, tamaño: 'familiar', cantidad: 1 }], desechables: { vasos: 1 } } });
        assert.equal(st, 200);
        assert.equal(r.orden.estado, 'Preparando');
        orden.estado = 'Cancelado';
        assert.equal((await api.post(`/api/orders/${id}/items`, { token: mesera, body: { items: [{ productoId: 1, tamaño: 'familiar', cantidad: 1 }] } }))[0], 409);
    });

    await t.test('adicionar reinicia un pago dividido (ya no cuadra) y deja el método de mayor valor', async () => {
        orden = { _id: id, estado: 'Pendiente', total: 50000, cliente: { metodoPago: 'Mixto' }, pagos: [{ metodo: 'Efectivo', monto: 20000 }, { metodo: 'Nequi', monto: 30000 }], items: [] };
        const [, r] = await api.post(`/api/orders/${id}/items`, { token: mesera, body: { items: [{ productoId: 75, tamaño: 'unico', cantidad: 1 }] } });
        assert.equal(r.pagoReiniciado, true);
        assert.equal(r.orden.cliente.metodoPago, 'Nequi');
        assert.equal(r.orden.pagos, undefined);
    });

    await t.test('caja corrige a pago dividido; cocina/mesera no pueden', async () => {
        orden = { _id: id, total: 50000, cliente: { metodoPago: 'Efectivo' }, items: [] };
        const pagos = [{ metodo: 'Nequi', monto: 25000 }, { metodo: 'Transferencia', monto: 25000 }];
        assert.equal((await api.patch(`/api/orders/${id}/pago`, { token: mesera, body: { pagos } }))[0], 403);
        const [st, o] = await api.patch(`/api/orders/${id}/pago`, { token: cajero, body: { pagos } });
        assert.equal(st, 200);
        assert.equal(o.cliente.metodoPago, 'Mixto');
        assert.equal((await api.patch(`/api/orders/${id}/pago`, { token: cajero, body: { pagos: [{ metodo: 'Nequi', monto: 1 }, { metodo: 'Efectivo', monto: 1 }] } }))[0], 400);
        const [, o2] = await api.patch(`/api/orders/${id}/pago`, { token: cajero, body: { metodoPago: 'Tarjeta' } });
        assert.equal(o2.cliente.metodoPago, 'Tarjeta');
        assert.equal(ultimoUpdate.cambios.$unset.pagos, 1);
    });
});
