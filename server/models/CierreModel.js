const mongoose = require('mongoose');

/**
 * Esquema de Cierre de Caja (Arqueo).
 * Almacena el balance financiero de un turno operativo.
 */
const CierreSchema = new mongoose.Schema({
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, default: Date.now },

  // Balance del Sistema
  totalVentasSistema: { type: Number, required: true },
  totalGastos: { type: Number, default: 0 },
  totalCajaTeorico: { type: Number, required: true }, // Efectivo esperado: Ventas en efectivo - Gastos

  // Desglose de ventas por método de pago: { Efectivo: 100000, Nequi: 50000, ... }
  ventasPorMetodo: { type: Map, of: Number, default: {} },

  // Balance Físico (Declarado por usuario)
  totalEfectivoReal: { type: Number, required: true },
  diferencia: { type: Number, required: true },       // Calculado: Real - Teórico

  cantidadPedidos: { type: Number, default: 0 },
  cantidadCancelados: { type: Number, default: 0 },
  usuario: { type: String, default: 'Admin' }
});

CierreSchema.index({ fechaFin: -1 });

module.exports = mongoose.model('Cierre', CierreSchema);
