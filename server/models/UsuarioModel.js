const mongoose = require('mongoose');

const ROLES_USUARIO = ['admin', 'cajero', 'mesera', 'cocina'];

/**
 * Usuario individual del personal (cada persona con su clave).
 * La clave se guarda con scrypt + sal; nunca en texto plano.
 */
const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 40 },
  nombreKey: { type: String, required: true, unique: true }, // nombre en minúsculas, para el login
  rol: { type: String, required: true, enum: ROLES_USUARIO },
  hash: { type: String, required: true },
  salt: { type: String, required: true },
  activo: { type: Boolean, default: true },
  claveCambiada: { type: Date, default: Date.now }, // invalida sesiones anteriores al cambio
  creado: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('Usuario', UsuarioSchema);
module.exports.ROLES_USUARIO = ROLES_USUARIO;
