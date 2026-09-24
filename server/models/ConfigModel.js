const mongoose = require('mongoose');

/**
 * Ajustes del negocio que se cambian desde la app (clave -> valor).
 * Ej: _id "diasCerrados" -> [{ dia: "2026-12-24", motivo: "Nochebuena" }]
 */
const ConfigSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  valor: { type: mongoose.Schema.Types.Mixed, default: null }
}, { versionKey: false });

module.exports = mongoose.model('Config', ConfigSchema);
