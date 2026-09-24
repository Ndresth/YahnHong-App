const crypto = require('crypto');
const { promisify } = require('util');
const Usuario = require('../models/UsuarioModel');
const Config = require('../models/ConfigModel');

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;

const claveKey = (nombre) => String(nombre || '').trim().toLowerCase();

const hashClave = async (clave) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await scrypt(clave, salt, KEYLEN)).toString('hex');
    return { salt, hash };
};

const verificarClave = async (clave, { salt, hash }) => {
    const calc = await scrypt(String(clave), salt, KEYLEN);
    const guardado = Buffer.from(hash, 'hex');
    return guardado.length === calc.length && crypto.timingSafeEqual(guardado, calc);
};

// Estado de los usuarios en memoria para validar cada petición sin ir a la BD
let cache = null; // Map id -> { activo, claveCambiada(ms) }
const cargar = async () => {
    const lista = await Usuario.find().select('activo claveCambiada').lean();
    cache = new Map(lista.map(u => [String(u._id), { activo: u.activo, claveCambiada: new Date(u.claveCambiada).getTime() }]));
    return cache;
};
const invalidar = () => { cache = null; };

/** ¿Sigue vigente la sesión? Tokens de usuario individual: activo y emitidos después del último cambio de clave. */
const sesionVigente = async (payload) => {
    if (!payload?.uid) return true; // sesión con clave compartida del rol
    const u = (cache || await cargar()).get(String(payload.uid));
    return Boolean(u && u.activo && payload.iat * 1000 >= u.claveCambiada - 1000);
};

// Ajuste: si está activo, las claves compartidas por rol sólo sirven para el admin
const CLAVE_SOLO_INDIVIDUALES = 'soloUsuariosIndividuales';
const soloIndividuales = async () => Boolean((await Config.findById(CLAVE_SOLO_INDIVIDUALES).lean())?.valor);
const setSoloIndividuales = (valor) => Config.updateOne({ _id: CLAVE_SOLO_INDIVIDUALES }, { $set: { valor: Boolean(valor) } }, { upsert: true });

module.exports = { claveKey, hashClave, verificarClave, sesionVigente, invalidar, soloIndividuales, setSoloIndividuales };
