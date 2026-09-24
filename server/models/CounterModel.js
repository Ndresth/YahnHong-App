const mongoose = require('mongoose');

/**
 * Contadores atómicos (ej: consecutivo de órdenes del turno).
 */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', CounterSchema);

Counter.next = async (name) => {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return doc.seq;
};

Counter.reset = (name) => Counter.updateOne({ _id: name }, { $set: { seq: 0 } }, { upsert: true });

module.exports = Counter;
