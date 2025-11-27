const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
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
      tamaño: String
    }
  ],
  total: Number,
  estado: { type: String, default: 'Pendiente' } // Pendiente, Completado
});

module.exports = mongoose.model('Order', OrderSchema);