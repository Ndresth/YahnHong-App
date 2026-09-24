const mongoose = require('mongoose');

const { EJSON } = mongoose.mongo.BSON;

/** Colecciones que se respaldan (todas las del negocio). */
const COLECCIONES = ['products', 'orders', 'cierres', 'gastos', 'counters', 'configs', 'usuarios'];

/**
 * Escribe un respaldo completo en formato Extended JSON (conserva fechas y ObjectId):
 * { "version": 1, "fecha": ..., "colecciones": { "orders": [ ... ], ... } }
 * Va documento por documento con un cursor, así no carga toda la BD en memoria.
 * `write` puede devolver una promesa (backpressure).
 */
const escribirRespaldo = async (db, write) => {
    await write(`{"version":1,"fecha":${JSON.stringify(new Date().toISOString())},"colecciones":{`);
    let primeraCol = true;
    const conteo = {};
    for (const nombre of COLECCIONES) {
        await write(`${primeraCol ? '' : ','}${JSON.stringify(nombre)}:[`);
        primeraCol = false;
        let n = 0;
        for await (const doc of db.collection(nombre).find()) {
            await write(`${n ? ',' : ''}\n${EJSON.stringify(doc, { relaxed: false })}`);
            n++;
        }
        conteo[nombre] = n;
        await write(']');
    }
    await write('}}\n');
    return conteo;
};

/**
 * Restaura un respaldo: cada documento se reemplaza por _id (upsert).
 * No borra lo que no esté en el respaldo, salvo con `reemplazar: true` (vacía cada colección antes).
 */
const restaurar = async (db, contenido, { reemplazar = false } = {}) => {
    const datos = EJSON.parse(contenido, { relaxed: true }); // números -> number; fechas y ObjectId se conservan
    if (datos?.version !== 1 || typeof datos.colecciones !== 'object') throw new Error('Archivo de respaldo inválido');
    const resultado = {};
    for (const [nombre, docs] of Object.entries(datos.colecciones)) {
        if (!COLECCIONES.includes(nombre)) continue;
        const col = db.collection(nombre);
        if (reemplazar) await col.deleteMany({});
        if (docs.length) {
            await col.bulkWrite(docs.map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })), { ordered: false });
        }
        resultado[nombre] = docs.length;
    }
    return { fecha: datos.fecha, resultado };
};

module.exports = { COLECCIONES, escribirRespaldo, restaurar };
