const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token } = require('./helpers');
const Product = require('../models/ProductModel');
const Gasto = require('../models/GastoModel');
const Usuario = require('../models/UsuarioModel');

// BD simulada: solo se usa en los casos válidos; los inválidos se rechazan antes de llegar a la BD
let creado = null;
let consultas = 0;
Usuario.findOne = () => { consultas++; return { lean: async () => null }; };
Product.findOne = () => ({ sort: () => ({ select: () => ({ lean: async () => ({ id: 89 }) }) }) });
Product.create = async (data) => (creado = data);
Gasto.create = async (data) => ({ _id: 'g1', ...data });

const app = crearApp({
    '/api/auth': require('../routes/auth'),
    '/api/orders': require('../routes/orders'),
    '/api/productos': require('../routes/productos'),
    '/api': require('../routes/caja')
});
const admin = token({ role: 'admin', nombre: 'Admin' });

test('validación de entrada (Zod)', async (t) => {
    const api = await servir(app);
    t.after(api.cerrar);

    await t.test('login: un objeto en vez de texto no llega a la BD (inyección NoSQL)', async () => {
        const [st, r] = await api.post('/api/auth/login', { body: { nombre: { $ne: null }, password: 'x' } });
        assert.equal(st, 400);
        assert.match(r.message, /Datos inválidos en "nombre"/);
        assert.equal(consultas, 0);
    });

    await t.test('pedido: tipos inválidos indican el campo', async () => {
        const base = { tipo: 'Domicilio', cliente: { nombre: 'Ana', telefono: '3001234567', direccion: 'Cl 1' } };
        let [st, r] = await api.post('/api/orders', { body: { ...base, items: [{ productoId: 1, tamaño: 'familiar', cantidad: 'dos' }] } });
        assert.equal(st, 400);
        assert.match(r.message, /"items\.0\.cantidad": se esperaba un número/);
        [st, r] = await api.post('/api/orders', { body: { ...base, items: 'todo' } });
        assert.equal(st, 400);
        assert.match(r.message, /"items"/);
        [st, r] = await api.post('/api/orders', { body: { ...base, cliente: { nombre: ['x'] }, items: [] } });
        assert.equal(st, 400);
        assert.match(r.message, /"cliente\.nombre"/);
    });

    await t.test('producto: descarta campos desconocidos y acepta precios como texto', async () => {
        const [st] = await api.post('/api/productos', {
            token: admin,
            body: { id: 999, _id: 'x', hack: true, nombre: 'Salsa', categoria: 'Salsas', precios: { unico: '500' } }
        });
        assert.equal(st, 201);
        assert.equal(creado.id, 90); // el id lo asigna el servidor, no el cliente
        assert.equal(creado.hack, undefined);
        assert.equal(creado.precios.unico, 500);
    });

    await t.test('disponible debe ser verdadero/falso', async () => {
        const [st, r] = await api.patch('/api/productos/1/disponible', { token: admin, body: { disponible: 'si' } });
        assert.equal(st, 400);
        assert.match(r.message, /"disponible"/);
    });

    await t.test('gasto: monto con operador de Mongo se rechaza; monto como texto se acepta', async () => {
        let [st] = await api.post('/api/gastos', { token: admin, body: { descripcion: 'Gas', monto: { $gt: 0 } } });
        assert.equal(st, 400);
        let r;
        [st, r] = await api.post('/api/gastos', { token: admin, body: { descripcion: 'Gas', monto: '15000' } });
        assert.equal(st, 201);
        assert.equal(r.monto, 15000);
    });

    await t.test('los mensajes de negocio de siempre se mantienen', async () => {
        const [st, r] = await api.post('/api/gastos', { token: admin, body: { monto: 1000 } });
        assert.equal(st, 400);
        assert.equal(r.message, 'La descripción es obligatoria');
    });
});
