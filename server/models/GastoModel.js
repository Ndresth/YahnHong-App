const mongoose = require('mongoose');

/**
 * Esquema de Gastos Operativos.
 * Registra salidas de efectivo de la caja menor.
 */
const GastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  usuario: { type: String, default: 'Sistema' },
  
  // Vinculación al cierre de caja correspondiente
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Gasto', GastoSchema);