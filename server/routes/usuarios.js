const express = require('express');
const Usuario = require('../models/UsuarioModel');
const { ROLES_USUARIO } = require('../models/UsuarioModel');
const { requireAuth, ROLES } = require('../middleware/auth');
const { cleanText, isObjectId, HttpError } = require('../lib/util');
const { claveKey, hashClave, invalidar, soloIndividuales, setSoloIndividuales } = require('../lib/usuarios');

const router = express.Router();
router.use(requireAuth(ROLES.ADMIN));

const CAMPOS = 'nombre rol activo creado claveCambiada';
const MIN_CLAVE = 6;

const validarClave = (clave) => {
    if (typeof clave !== 'string' || clave.length < MIN_CLAVE || clave.length > 72) {
        throw new HttpError(400, `La clave debe tener entre ${MIN_CLAVE} y 72 caracteres`);
    }
    return clave;
};

router.get('/', async (req, res) => {
    const [usuarios, solo] = await Promise.all([Usuario.find().select(CAMPOS).sort({ nombre: 1 }).lean(), soloIndividuales()]);
    res.json({ usuarios, soloIndividuales: solo });
});

router.post('/', async (req, res) => {
    const nombre = cleanText(req.body?.nombre, 40);
    const rol = req.body?.rol;
    if (nombre.length < 2) throw new HttpError(400, 'El nombre es obligatorio');
    if (!ROLES_USUARIO.includes(rol)) throw new HttpError(400, 'Rol inválido');
    const clave = validarClave(req.body?.clave);
    if (await Usuario.exists({ nombreKey: claveKey(nombre) })) throw new HttpError(409, 'Ya existe un usuario con ese nombre');

    const u = await Usuario.create({ nombre, nombreKey: claveKey(nombre), rol, ...(await hashClave(clave)) });
    invalidar();
    res.status(201).json({ _id: u._id, nombre: u.nombre, rol: u.rol, activo: u.activo, creado: u.creado });
});

// Cambiar rol, activar/desactivar o poner nueva clave (cierra sus sesiones abiertas)
router.patch('/:id', async (req, res) => {
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');
    const cambios = {};
    if (req.body?.rol !== undefined) {
        if (!ROLES_USUARIO.includes(req.body.rol)) throw new HttpError(400, 'Rol inválido');
        cambios.rol = req.body.rol;
        cambios.claveCambiada = new Date(); // el rol viaja en el token: se fuerza nuevo login
    }
    if (req.body?.activo !== undefined) cambios.activo = Boolean(req.body.activo);
    if (req.body?.clave !== undefined) {
        Object.assign(cambios, await hashClave(validarClave(req.body.clave)), { claveCambiada: new Date() });
    }
    if (!Object.keys(cambios).length) throw new HttpError(400, 'Nada que cambiar');

    const u = await Usuario.findByIdAndUpdate(req.params.id, cambios, { returnDocument: 'after' }).select(CAMPOS).lean();
    if (!u) throw new HttpError(404, 'Usuario no encontrado');
    invalidar();
    res.json(u);
});

router.delete('/:id', async (req, res) => {
    if (!isObjectId(req.params.id)) throw new HttpError(400, 'ID inválido');
    if (String(req.params.id) === String(req.user.uid)) throw new HttpError(400, 'No puede eliminar su propio usuario');
    await Usuario.findByIdAndDelete(req.params.id);
    invalidar();
    res.json({ message: 'Eliminado' });
});

router.put('/solo-individuales', async (req, res) => {
    await setSoloIndividuales(req.body?.valor);
    res.json({ soloIndividuales: await soloIndividuales() });
});

module.exports = router;
