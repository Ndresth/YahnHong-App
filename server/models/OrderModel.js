// server/models/OrderModel.js ACTUALIZADO
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  tipo: { type: String, default: 'Mesa' }, // Nuevo: Mesa, Domicilio, Llevar
  numeroMesa: { type: String, default: null }, // Nuevo
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
      nota: { type: String, default: '' } // Nuevo: Notas de cocina
    }
  ],
  total: Number,
  estado: { type: String, default: 'Pendiente' },
  // Nuevo: Para vincular al cierre de caja
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Order', OrderSchema);