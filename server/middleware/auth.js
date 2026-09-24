const jwt = require('jsonwebtoken');
const { sesionVigente } = require('../lib/usuarios');

const SECRET_KEY = process.env.JWT_SECRET;

const ROLES = {
    ADMIN: 'admin',
    CAJERO: 'cajero',
    MESERA: 'mesera',
    COCINA: 'cocina'
};
const STAFF = Object.values(ROLES);

const readToken = (req) => {
    const header = req.headers['authorization'] || '';
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
};

/** Exige un token válido. Si se pasan roles, exige además uno de ellos. */
const requireAuth = (...roles) => async (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Acceso denegado. Token requerido.' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
    } catch {
        return res.status(401).json({ message: 'Sesión expirada. Inicie sesión de nuevo.' });
    }
    // Usuario desactivado o con clave cambiada: la sesión deja de servir de inmediato
    if (!(await sesionVigente(req.user))) {
        return res.status(401).json({ message: 'Su usuario fue desactivado o cambió su clave. Inicie sesión de nuevo.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'No tiene permisos para esta acción.' });
    }
    next();
};

/** Adjunta req.user si viene un token válido, pero no lo exige. */
const optionalAuth = async (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try { req.user = jwt.verify(token, SECRET_KEY); } catch { /* token inválido: se trata como anónimo */ }
        if (req.user && !(await sesionVigente(req.user))) req.user = undefined;
    }
    next();
};

const signToken = (payload) => jwt.sign(payload, SECRET_KEY, { expiresIn: '14h' });

module.exports = { ROLES, STAFF, requireAuth, optionalAuth, signToken };
