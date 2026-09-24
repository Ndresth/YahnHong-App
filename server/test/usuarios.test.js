const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token, aleatorio } = require('./helpers');
const Usuario = require('../models/UsuarioModel');
const Config = require('../models/ConfigModel');
const { hashClave, verificarClave, invalidar } = require('../lib/usuarios');
const { requireAuth } = require('../middleware/auth');

// BD simulada de usuarios
const usuarios = new Map();
let soloIndividuales = false;
Usuario.findOne = ({ nombreKey }) => ({ lean: async () => [...usuarios.values()].find(u => u.nombreKey === nombreKey) || null });
Usuario.find = () => ({ select: () => ({ lean: async () => [...usuarios.values()] }) });
Config.findById = () => ({ lean: async () => ({ valor: soloIndividuales }) });

const app = crearApp({ '/api/auth': require('../routes/auth') });
app.get('/api/privado', requireAuth(), (req, res) => res.json({ ok: true, nombre: req.user.nombre }));

const { ADMIN_PASSWORD, CAJERO_PASSWORD, MESERA_PASSWORD } = process.env;
const CLAVE_LUZ = aleatorio();

test('claves con scrypt', async () => {
    const clave = aleatorio();
    const h = await hashClave(clave);
    assert.notEqual(h.hash, clave);
    assert.equal(await verificarClave(clave, h), true);
    assert.equal(await verificarClave('otra', h), false);
});

test('login y sesiones', async (t) => {
    const api = await servir(app);
    t.after(api.cerrar);
    usuarios.set('u1', { _id: 'u1', nombre: 'Luz', nombreKey: 'luz', rol: 'mesera', activo: true, claveCambiada: new Date(0), ...(await hashClave(CLAVE_LUZ)) });

    await t.test('usuario individual entra con su clave; su nombre no se puede usar con la clave compartida', async () => {
        const [st, r] = await api.post('/api/auth/login', { body: { nombre: 'LUZ', password: CLAVE_LUZ } });
        assert.equal(st, 200);
        assert.equal(r.role, 'mesera');
        assert.equal(r.nombre, 'Luz');
        assert.equal((await api.post('/api/auth/login', { body: { nombre: 'Luz', password: MESERA_PASSWORD } }))[0], 401);
    });

    await t.test('clave compartida del rol sigue funcionando con otros nombres', async () => {
        const [st, r] = await api.post('/api/auth/login', { body: { nombre: 'Temporal', password: CAJERO_PASSWORD } });
        assert.equal(st, 200);
        assert.equal(r.role, 'cajero');
    });

    await t.test('"solo usuarios individuales": la clave compartida solo sirve al admin', async () => {
        soloIndividuales = true;
        assert.equal((await api.post('/api/auth/login', { body: { nombre: 'X', password: CAJERO_PASSWORD } }))[0], 401);
        assert.equal((await api.post('/api/auth/login', { body: { nombre: 'Jefe', password: ADMIN_PASSWORD } }))[0], 200);
        soloIndividuales = false;
    });

    await t.test('desactivar o cambiar la clave cierra las sesiones abiertas', async () => {
        const [, r] = await api.post('/api/auth/login', { body: { nombre: 'luz', password: CLAVE_LUZ } });
        assert.equal((await api.get('/api/privado', { token: r.token }))[0], 200);

        usuarios.get('u1').activo = false;
        invalidar();
        assert.equal((await api.get('/api/privado', { token: r.token }))[0], 401);
        assert.equal((await api.post('/api/auth/login', { body: { nombre: 'luz', password: CLAVE_LUZ } }))[0], 401);

        usuarios.get('u1').activo = true;
        usuarios.get('u1').claveCambiada = new Date(Date.now() + 5000);
        invalidar();
        assert.equal((await api.get('/api/privado', { token: r.token }))[0], 401);
    });

    await t.test('tokens de clave compartida (sin uid) no dependen de la tabla de usuarios', async () => {
        assert.equal((await api.get('/api/privado', { token: token({ role: 'admin', nombre: 'Admin' }) }))[0], 200);
    });
});
