const mongoose = require('mongoose');

/**
 * Esquema de Gastos Operativos.
 * Registra salidas de efectivo de la caja menor.
 */
const GastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true, trim: true, maxlength: 120 },
  monto: { type: Number, required: true, min: 1 },
  fecha: { type: Date, default: Date.now },
  usuario: { type: String, default: 'Sistema' },

  // Vinculación al cierre de caja correspondiente
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null }
});

GastoSchema.index({ cierre_id: 1, fecha: -1 });
GastoSchema.index({ fecha: -1 }); // Reportes por rango de fechas

module.exports = mongoose.model('Gasto', GastoSchema);
