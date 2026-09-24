/**
 * Respaldo completo de la BD a un archivo JSON.
 *   node scripts/respaldo.js [archivo]
 * Usa MONGO_URI (de server/.env o del entorno). Lo usa también el workflow semanal de GitHub.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('fs');
const mongoose = require('mongoose');
const { escribirRespaldo } = require('../lib/respaldo');

const archivo = process.argv[2] || `respaldo-${new Date().toISOString().slice(0, 10)}.json`;

(async () => {
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const out = fs.createWriteStream(archivo);
    const write = (s) => (out.write(s) ? null : new Promise(r => out.once('drain', r)));
    const conteo = await escribirRespaldo(mongoose.connection.db, write);
    await new Promise((r, j) => out.end(e => (e ? j(e) : r())));
    console.log(`[OK] Respaldo guardado en ${archivo}:`, conteo);
    await mongoose.disconnect();
})().catch(async (e) => {
    console.error('[ERROR]', e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
