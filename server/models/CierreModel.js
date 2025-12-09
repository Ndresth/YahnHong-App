const mongoose = require('mongoose');

const CierreSchema = new mongoose.Schema({
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, default: Date.now },
  totalVentasSistema: { type: Number, required: true }, 
  totalGastos: { type: Number, default: 0 },          
  totalCajaTeorico: { type: Number, required: true },
  totalEfectivoReal: { type: Number, required: true },
  diferencia: { type: Number, required: true },
  cantidadPedidos: { type: Number, default: 0 },
  usuario: { type: String, default: 'Admin' }
});

module.exports = mongoose.model('Cierre', CierreSchema);