const mongoose = require('mongoose');

/**
 * Esquema de Órdenes de Venta.
 * Representa una transacción individual o comanda.
 */
const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  
  // Clasificación Operativa
  tipo: { type: String, required: true }, // Enum: 'Mesa' | 'Domicilio'
  numeroMesa: { type: String, default: null },
  
  cliente: {
    nombre: String,
    telefono: String,
    direccion: String,
    metodoPago: String
  },
  
  items: [
    {
      nombre: String,
      cantidad: Number,
      precio: Number,
      tamaño: String,
      nota: { type: String, default: '' } // Observaciones de preparación
    }
  ],
  
  total: Number,
  estado: { type: String, default: 'Pendiente' }, // Enum: 'Pendiente' | 'Completado' | 'Cancelado'
  
  // Referencia al cierre de caja (null = Activa en turno actual)
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Order', OrderSchema);