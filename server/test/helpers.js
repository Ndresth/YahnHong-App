/**
 * Utilidades de prueba: app Express con las rutas reales y los modelos de Mongoose simulados
 * (no hace falta una BD). Cada prueba define lo que devuelven los métodos que usa.
 */
// Valores aleatorios en cada ejecución: no hay secretos escritos en el código
const { randomBytes } = require('crypto');
const aleatorio = () => randomBytes(24).toString('hex');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = aleatorio();
process.env.ADMIN_PASSWORD = aleatorio();
process.env.CAJERO_PASSWORD = aleatorio();
process.env.MESERA_PASSWORD = aleatorio();

const express = require('express');
const jwt = require('jsonwebtoken');
const events = require('../lib/events');

events.publish = () => {}; // sin clientes SSE en pruebas

const crearApp = (rutas) => {
    const app = express();
    app.use(express.json());
    for (const [base, router] of Object.entries(rutas)) app.use(base, router);
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.message }));
    return app;
};

/** Levanta la app en un puerto libre y devuelve helpers get/post/... que responden [status, json]. */
const servir = async (app) => {
    const srv = await new Promise(r => { const s = app.listen(0, () => r(s)); });
    const base = `http://127.0.0.1:${srv.address().port}`;
    const pedir = (method) => async (url, { body, token } = {}) => {
        const headers = {};
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (token) headers.Authorization = `Bearer ${token}`;
        const r = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const texto = await r.text();
        let json; try { json = JSON.parse(texto); } catch { json = texto; }
        return [r.status, json];
    };
    return {
        get: pedir('GET'), post: pedir('POST'), patch: pedir('PATCH'), put: pedir('PUT'), del: pedir('DELETE'),
        cerrar: () => new Promise(r => srv.close(r))
    };
};

const token = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

module.exports = { crearApp, servir, token, aleatorio };
