/**
 * Restaura un respaldo creado con scripts/respaldo.js o con "Descargar respaldo" en Caja.
 *   node scripts/restaurar.js respaldo.json --confirmar              (reemplaza por _id, no borra lo demás)
 *   node scripts/restaurar.js respaldo.json --confirmar --reemplazar (vacía cada colección antes)
 * ¡Ojo! Escribe en la BD de MONGO_URI.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });
const fs = require('fs');
const mongoose = require('mongoose');
const { restaurar } = require('../lib/respaldo');

const [archivo, ...flags] = process.argv.slice(2);

(async () => {
    if (!archivo || !flags.includes('--confirmar')) {
        console.log('Uso: node scripts/restaurar.js <respaldo.json> --confirmar [--reemplazar]');
        process.exit(1);
    }
    if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI');
    const contenido = fs.readFileSync(archivo, 'utf8');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
    const r = await restaurar(mongoose.connection.db, contenido, { reemplazar: flags.includes('--reemplazar') });
    console.log(`[OK] Restaurado el respaldo del ${r.fecha}:`, r.resultado);
    await mongoose.disconnect();
})().catch(async (e) => {
    console.error('[ERROR]', e.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
