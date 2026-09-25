const mongoose = require('mongoose');

const ESTADOS = ['Pendiente', 'Preparando', 'Listo', 'Completado', 'Cancelado'];
const TIPOS = ['Mesa', 'Llevar', 'Domicilio'];
const { METODOS_PAGO } = require('../lib/pagos');

/**
 * Esquema de Órdenes de Venta.
 * Representa una transacción individual o comanda.
 */
const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  numero: { type: Number }, // Consecutivo del turno (se reinicia en cada cierre)

  // Clasificación Operativa
  tipo: { type: String, required: true, enum: TIPOS },
  numeroMesa: { type: String, default: null },
  origen: { type: String, default: 'POS' }, // 'POS' | 'Web'
  horaProgramada: { type: Date, default: null }, // null = lo antes posible

  cliente: {
    nombre: String,
    telefono: String,
    direccion: String,
    metodoPago: String // 'Mixto' si el pago está dividido (ver pagos)
  },

  // Pago dividido entre métodos: [{ metodo, monto }] que suman el total. Vacío = todo con cliente.metodoPago
  pagos: { type: [{ metodo: { type: String, enum: METODOS_PAGO }, monto: Number, _id: false }], default: undefined },

  items: [
    {
      productoId: Number,
      nombre: String,
      cantidad: Number,
      precio: Number,
      tamaño: String,
      nota: { type: String, default: '' }, // Observaciones de preparación
      extra: { type: Boolean, default: false }, // Desechables (cucharas, platos)
      agregadoEn: { type: Date, default: undefined } // Adición a una orden ya enviada a cocina
    }
  ],

  total: Number, // Calculado SIEMPRE en el servidor con precios de la BD
  estado: { type: String, default: 'Pendiente', enum: ESTADOS },
  usuario: { type: String, default: '' }, // Quién registró la orden
  anuladoPor: { type: String, default: null }, // Quién la anuló (auditoría)
  anuladoEn: { type: Date, default: null },

  // Referencia al cierre de caja (null = Activa en turno actual)
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null }
});

OrderSchema.index({ cierre_id: 1, estado: 1, fecha: -1 });
OrderSchema.index({ fecha: -1 }); // Reportes por rango de fechas

module.exports = mongoose.model('Order', OrderSchema);
module.exports.ESTADOS = ESTADOS;
module.exports.TIPOS = TIPOS;
module.exports.METODOS_PAGO = METODOS_PAGO;
