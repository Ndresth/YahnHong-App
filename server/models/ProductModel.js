const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  categoria: { type: String, required: true },
  nombre: { type: String, required: true },
  descripcion: String,
  imagen: String,
  precios: {
    familiar: Number,
    mediano: Number,
    personal: Number,
    unico: Number
  }
});

module.exports = mongoose.model('Product', ProductSchema);