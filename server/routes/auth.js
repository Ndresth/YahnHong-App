const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Usuario = require('../models/UsuarioModel');
const { ROLES, signToken } = require('../middleware/auth');
const { cleanText } = require('../lib/util');
const { claveKey, verificarClave, soloIndividuales } = require('../lib/usuarios');

const router = express.Router();

// Máximo 10 intentos fallidos cada 15 minutos por IP (freno a fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.' }
});

// Comparación en tiempo constante (evita ataques de tiempo)
const safeEqual = (a, b) => {
    if (!a || !b) return false;
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
};

const CREDENCIALES = [
    { role: ROLES.ADMIN, env: 'ADMIN_PASSWORD' },
    { role: ROLES.CAJERO, env: 'CAJERO_PASSWORD' },
    { role: ROLES.MESERA, env: 'MESERA_PASSWORD' },
    { role: ROLES.COCINA, env: 'COCINA_PASSWORD' }
];

const BIENVENIDA = {
    admin: 'Bienvenido Admin',
    cajero: 'Turno de Caja Iniciado',
    mesera: 'Bienvenido POS',
    cocina: 'Pantalla de Cocina'
};

const responder = (res, { role, nombre, uid }) => {
    const token = signToken(uid ? { role, nombre, uid } : { role, nombre });
    res.json({ token, role, nombre, message: BIENVENIDA[role] });
};

/**
 * Login:
 * 1) Si el nombre es de un usuario individual, SÓLO vale su propia clave (nadie puede usar su nombre).
 * 2) Si no, clave compartida del rol (variables de entorno). Con "sólo usuarios individuales"
 *    activado, las claves compartidas únicamente sirven para el admin (para no quedar por fuera).
 */
router.post('/login', loginLimiter, async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const nombre = cleanText(req.body?.nombre, 40);
    const invalidas = () => res.status(401).json({ message: 'Credenciales inválidas' });

    // Si la BD falla, se sigue con las claves compartidas (el admin nunca queda por fuera)
    const usuario = nombre ? await Usuario.findOne({ nombreKey: claveKey(nombre) }).lean().catch(() => null) : null;
    if (usuario) {
        if (!usuario.activo || !(await verificarClave(password, usuario))) return invalidas();
        return responder(res, { role: usuario.rol, nombre: usuario.nombre, uid: String(usuario._id) });
    }

    const match = CREDENCIALES.find(c => safeEqual(password, process.env[c.env]));
    if (!match) return invalidas();
    if (match.role !== ROLES.ADMIN && await soloIndividuales().catch(() => false)) {
        return res.status(401).json({ message: 'Ingrese con su usuario y clave personal' });
    }
    const usuarioNombre = nombre || match.role.charAt(0).toUpperCase() + match.role.slice(1);
    responder(res, { role: match.role, nombre: usuarioNombre });
});

module.exports = router;
