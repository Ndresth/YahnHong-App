const mongoose = require('mongoose');
const Config = require('../models/ConfigModel');
const { diaBogota } = require('./fechas');

/**
 * Días especiales en que el local no recibe pedidos web (festividades, imprevistos).
 * Se guardan en la colección configs y se mantienen en memoria (una sola instancia).
 */
const CLAVE = 'diasCerrados';
let cache = null;

/**
 * Map AAAA-MM-DD -> motivo, sólo de hoy en adelante.
 * Sin BD (arranque o caída de Atlas) devuelve lo último conocido o vacío: el horario normal sigue funcionando.
 */
const obtener = async () => {
    if (!cache) {
        if (mongoose.connection.readyState !== 1 && process.env.NODE_ENV !== 'test') return new Map();
        try {
            const doc = await Config.findById(CLAVE).lean();
            cache = new Map((doc?.valor || []).map(d => [d.dia, d.motivo || '']));
        } catch (err) {
            console.warn('[WARN] No se pudieron leer los días cerrados:', err.message);
            return new Map();
        }
    }
    const hoy = diaBogota();
    return new Map([...cache].filter(([dia]) => dia >= hoy));
};

const guardar = async (mapa) => {
    const hoy = diaBogota();
    const valor = [...mapa].filter(([dia]) => dia >= hoy).sort().map(([dia, motivo]) => ({ dia, motivo }));
    await Config.updateOne({ _id: CLAVE }, { $set: { valor } }, { upsert: true });
    cache = new Map(valor.map(d => [d.dia, d.motivo]));
    return valor;
};

const agregar = async (dia, motivo) => {
    const mapa = await obtener();
    mapa.set(dia, motivo);
    return guardar(mapa);
};

const quitar = async (dia) => {
    const mapa = await obtener();
    mapa.delete(dia);
    return guardar(mapa);
};

const listar = async () => [...(await obtener())].sort().map(([dia, motivo]) => ({ dia, motivo }));

module.exports = { obtener, agregar, quitar, listar };
