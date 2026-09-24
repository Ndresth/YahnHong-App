const mongoose = require('mongoose');

/** Recorta y limita un texto de entrada. Devuelve '' si no es string. */
const cleanText = (value, max = 120) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Envuelve un error de validación para responder 400 con un mensaje claro. */
class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

module.exports = { cleanText, isObjectId, HttpError };
