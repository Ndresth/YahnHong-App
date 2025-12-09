const mongoose = require('mongoose');

const GastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  usuario: { type: String, default: 'Sistema' },
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Gasto', GastoSchema);