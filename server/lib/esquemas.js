const { z } = require('zod');
const { HttpError } = require('./util');
const { TAMANOS } = require('../models/ProductModel');
const { DESECHABLES } = require('./desechables');

/**
 * Contratos de entrada de la API (Zod).
 * Revisan el TIPO y la forma de lo que llega (texto donde va texto, número donde va número,
 * listas donde van listas) y descartan campos desconocidos. Las reglas del negocio
 * (obligatorios, precios de la BD, horario, cantidades máximas) siguen en cada ruta,
 * con sus mensajes de siempre.
 */
z.config(z.locales.es());

// Número o texto numérico ("5000"): los formularios a veces envían texto
const numero = z.union([z.number(), z.string().trim().regex(/^-?\d+(\.\d+)?$/).transform(Number)], { error: 'se esperaba un número' })
    .pipe(z.number().finite());
// Cantidad opcional: vacío o null cuentan como 0
const cantidadOpcional = z.union([numero, z.literal(''), z.null()]).optional();
const texto = (max) => z.string().max(max);
const opcional = (esquema) => esquema.nullish().transform(v => v ?? undefined);

const desechables = z.object(Object.fromEntries(Object.keys(DESECHABLES).map(k => [k, cantidadOpcional]))).nullish();

const itemPedido = z.object({
    productoId: numero,
    tamaño: texto(20),
    cantidad: numero,
    nota: opcional(texto(500))
});

const parteDePago = z.object({ metodo: texto(30), monto: numero });

const esquemas = {
    login: z.object({
        nombre: opcional(texto(100)),
        password: opcional(texto(200))
    }),

    orden: z.object({
        tipo: opcional(texto(20)),
        numeroMesa: opcional(z.union([texto(10), numero])),
        horaProgramada: opcional(texto(10)),
        cliente: z.object({
            nombre: opcional(texto(200)),
            telefono: opcional(texto(50)),
            direccion: opcional(texto(400)),
            metodoPago: opcional(texto(30))
        }).nullish(),
        items: z.array(itemPedido).max(200).optional(),
        desechables,
        pagos: z.array(parteDePago).max(10).optional()
    }),

    adicion: z.object({
        items: z.array(itemPedido).max(200).optional(),
        desechables
    }),

    estado: z.object({ estado: texto(20) }),

    pago: z.object({
        metodoPago: opcional(texto(30)),
        pagos: z.array(parteDePago).max(10).optional()
    }),

    producto: z.object({
        nombre: opcional(texto(200)),
        categoria: opcional(texto(100)),
        descripcion: opcional(texto(1000)),
        imagen: opcional(texto(1000)),
        disponible: z.boolean().optional(),
        precios: z.object(Object.fromEntries(TAMANOS.map(t => [t, cantidadOpcional]))).optional()
    }),

    disponible: z.object({ disponible: z.boolean() }),

    gasto: z.object({
        descripcion: opcional(texto(500)),
        monto: opcional(numero)
    }),

    diaCerrado: z.object({
        dia: opcional(texto(10)),
        motivo: opcional(texto(200))
    }),

    cierre: z.object({ efectivoReal: opcional(numero) }),

    usuarioNuevo: z.object({
        nombre: opcional(texto(100)),
        rol: opcional(texto(20)),
        clave: opcional(texto(200))
    }),

    usuarioCambio: z.object({
        rol: texto(20).optional(),
        activo: z.boolean().optional(),
        clave: texto(200).optional()
    }),

    soloIndividuales: z.object({ valor: z.boolean() })
};

/**
 * Middleware: valida req.body con el esquema y lo reemplaza por la versión limpia.
 * Si no cumple, responde 400 indicando el campo, p. ej. «Datos inválidos en "items.0.cantidad": ...».
 */
const validar = (esquema) => (req, res, next) => {
    const r = esquema.safeParse(req.body ?? {});
    if (!r.success) {
        const problema = r.error.issues[0];
        const campo = problema.path.join('.');
        return next(new HttpError(400, `Datos inválidos${campo ? ` en "${campo}"` : ''}: ${problema.message}`));
    }
    req.body = r.data;
    next();
};

module.exports = { esquemas, validar };
