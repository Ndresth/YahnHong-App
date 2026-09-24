const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token } = require('./helpers');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const Counter = require('../models/CounterModel');
const Config = require('../models/ConfigModel');

// BD simulada
const PRODUCTOS = [
    { id: 1, nombre: 'Arroz Paisa', categoria: 'Arroz Frito', precios: { familiar: 50000, mediano: 38000 } },
    { id: 75, nombre: 'Coca Cola 1.5', categoria: 'Bebidas', precios: { unico: 9000 } },
    { id: 9, nombre: 'Agotado', categoria: 'Porciones', precios: { unico: 5000 }, disponible: false }
];
Product.find = (q) => ({ lean: async () => PRODUCTOS.filter(p => q.id.$in.includes(p.id)) });
Counter.next = async () => 7;
Order.create = async (o) => ({ _id: 'x', ...o });
Config.findById = () => ({ lean: async () => null });
Config.updateOne = async () => ({});
const diasCerrados = require('../lib/diasCerrados');
let guardada = null;
Order.findOneAndUpdate = async (filtro, cambios) => (guardada = { _id: filtro._id, ...cambios });

const app = crearApp({ '/api/orders': require('../routes/orders') });
const item = (productoId, tamaño, cantidad = 1) => ({ productoId, tamaño, cantidad });
const web = (extra = {}) => ({
    tipo: 'Domicilio',
    cliente: { nombre: 'Ana', telefono: '300 123 4567', direccion: 'Cl 45 - Centro', metodoPago: 'Nequi' },
    items: [item(1, 'familiar', 2)],
    ...extra
});

test('pedidos', async (t) => {
    const api = await servir(app);
    t.after(api.cerrar);
    // Miércoles 23-sep-2026, 12:00 m. en Colombia (abierto)
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-23T17:00:00Z') });

    await t.test('el total lo calcula el servidor con precios de la BD (ignora precios del cliente)', async () => {
        const [st, o] = await api.post('/api/orders', { body: web({ items: [{ ...item(1, 'familiar', 2), precio: 1 }], desechables: { platos: 2 } }) });
        assert.equal(st, 201);
        assert.equal(o.total, 2 * 50000 + 2 * 300);
        assert.equal(o.origen, 'Web');
    });

    await t.test('valida tamaño, agotados, cantidad y vasos sin bebida', async () => {
        assert.equal((await api.post('/api/orders', { body: web({ items: [item(1, 'personal')] }) }))[0], 400);
        assert.equal((await api.post('/api/orders', { body: web({ items: [item(9, 'unico')] }) }))[0], 409);
        assert.equal((await api.post('/api/orders', { body: web({ items: [item(1, 'familiar', 100)] }) }))[0], 400);
        assert.equal((await api.post('/api/orders', { body: web({ desechables: { vasos: 1 } }) }))[0], 400);
        const [st] = await api.post('/api/orders', { body: web({ items: [item(75, 'unico')], desechables: { vasos: 1 } }) });
        assert.equal(st, 201);
    });

    await t.test('la web no puede crear pedidos de mesa (se trata como domicilio)', async () => {
        const [st, o] = await api.post('/api/orders', { body: web({ tipo: 'Mesa', numeroMesa: '3' }) });
        assert.equal(st, 201);
        assert.equal(o.tipo, 'Domicilio');
    });

    await t.test('Recoger (Llevar web) exige nombre y teléfono', async () => {
        const base = { tipo: 'Llevar', items: [item(1, 'mediano')] };
        assert.equal((await api.post('/api/orders', { body: { ...base, cliente: { telefono: '3001234567' } } }))[0], 400);
        assert.equal((await api.post('/api/orders', { body: { ...base, cliente: { nombre: 'Ana', telefono: '12' } } }))[0], 400);
        const [st, o] = await api.post('/api/orders', { body: { ...base, cliente: { nombre: 'Ana', telefono: '3001234567' }, horaProgramada: '14:00' } });
        assert.equal(st, 201);
        assert.equal(o.tipo, 'Llevar');
        assert.equal(new Date(o.horaProgramada).toISOString(), '2026-09-23T19:00:00.000Z');
    });

    await t.test('hora programada: dentro del horario de hoy', async () => {
        assert.equal((await api.post('/api/orders', { body: web({ horaProgramada: '20:15' }) }))[0], 400);
        assert.equal((await api.post('/api/orders', { body: web({ horaProgramada: '12:05' }) }))[0], 400); // < 10 min
        assert.equal((await api.post('/api/orders', { body: web({ horaProgramada: '20:00' }) }))[0], 201);
    });

    await t.test('fuera de horario: la web solo puede programar; el POS no tiene restricción', async () => {
        t.mock.timers.setTime(new Date('2026-09-23T14:00:00Z').getTime()); // 9:00 a. m.
        const [st, e] = await api.post('/api/orders', { body: web() });
        assert.equal(st, 409);
        assert.match(e.message, /Abrimos hoy a las 11:30/);
        assert.equal((await api.post('/api/orders', { body: web({ horaProgramada: '12:00' }) }))[0], 201);

        const mesera = token({ role: 'mesera', nombre: 'Luz' });
        const [stPos, o] = await api.post('/api/orders', { token: mesera, body: { tipo: 'Mesa', numeroMesa: '4', items: [item(1, 'familiar')] } });
        assert.equal(stPos, 201);
        assert.equal(o.usuario, 'Luz');
    });

    await t.test('día cerrado especial bloquea pedidos web', async () => {
        t.mock.timers.setTime(new Date('2026-09-23T17:00:00Z').getTime());
        await diasCerrados.agregar('2026-09-23', 'Evento privado');
        const [st, e] = await api.post('/api/orders', { body: web() });
        await diasCerrados.quitar('2026-09-23');
        assert.equal(st, 409);
        assert.match(e.message, /Evento privado/);
    });

    await t.test('anular guarda quién anuló; solo caja puede anular', async () => {
        const id = '507f1f77bcf86cd799439011';
        const mesera = token({ role: 'mesera', nombre: 'Luz' });
        assert.equal((await api.patch(`/api/orders/${id}/estado`, { token: mesera, body: { estado: 'Cancelado' } }))[0], 403);
        const cajero = token({ role: 'cajero', nombre: 'Pedro' });
        const [st] = await api.patch(`/api/orders/${id}/estado`, { token: cajero, body: { estado: 'Cancelado' } });
        assert.equal(st, 200);
        assert.equal(guardada.anuladoPor, 'Pedro');
    });
});
