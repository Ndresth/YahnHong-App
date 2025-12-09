const mongoose = require('mongoose');

/**
 * Esquema de Producto (Inventario).
 * Define la estructura de datos para los ítems disponibles en el menú.
 * Incluye categorización, descripción y lista de precios polimórfica.
 */
const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  categoria: { type: String, required: true }, // Ej: "Arroz Frito", "Bebidas"
  nombre: { type: String, required: true },
  descripcion: { type: String }, // Detalle de ingredientes o preparación
  imagen: { type: String }, // URL del recurso estático
  
  // Estructura de precios según tamaño
  precios: {
    familiar: { type: Number, default: 0 },
    mediano: { type: Number, default: 0 },
    personal: { type: Number, default: 0 },
    unico: { type: Number, default: 0 } // Para items de talla única (ej: Bebidas)
  }
});

module.exports = mongoose.model('Product', ProductSchema);