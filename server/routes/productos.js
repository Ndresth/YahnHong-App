const express = require('express');
const Product = require('../models/ProductModel');
const { TAMANOS } = require('../models/ProductModel');
const { requireAuth, ROLES } = require('../middleware/auth');
const { cleanText, HttpError } = require('../lib/util');

const router = express.Router();

// Caché en memoria del menú: el menú se lee muchísimo más de lo que se edita
let cache = null;
const invalidate = () => { cache = null; };
const getMenu = async () => {
    if (!cache) cache = await Product.find().sort({ id: 1 }).lean();
    return cache;
};

/** Sólo acepta los campos permitidos (evita que se inyecten campos arbitrarios). */
const sanitize = (body, partial = false) => {
    const data = {};
    if (!partial || body.nombre !== undefined) {
        data.nombre = cleanText(body.nombre, 80);
        if (!data.nombre) throw new HttpError(400, 'El nombre es obligatorio');
    }
    if (!partial || body.categoria !== undefined) {
        data.categoria = cleanText(body.categoria, 40);
        if (!data.categoria) throw new HttpError(400, 'La categoría es obligatoria');
    }
    if (body.descripcion !== undefined) data.descripcion = cleanText(body.descripcion, 300);
    if (body.imagen !== undefined) {
        const img = cleanText(body.imagen, 300);
        if (img && !/^(\/images\/|https:\/\/)/.test(img)) throw new HttpError(400, 'La imagen debe ser /images/... o una URL https://');
        data.imagen = img;
    }
    if (body.disponible !== undefined) data.disponible = Boolean(body.disponible);
    if (!partial || body.precios !== undefined) {
        const precios = {};
        for (const t of TAMANOS) {
            const v = Math.round(Number(body.precios?.[t]) || 0);
            if (v < 0 || v > 10000000) throw new HttpError(400, 'Precio inválido');
            precios[t] = v;
        }
        if (!Object.values(precios).some(v => v > 0)) throw new HttpError(400, 'Debe tener al menos un precio');
        data.precios = precios;
    }
    return data;
};

router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-cache'); // El navegador revalida con ETag (304 si no cambió)
    res.json(await getMenu());
});

router.post('/', requireAuth(ROLES.ADMIN), async (req, res) => {
    const data = sanitize(req.body);
    const last = await Product.findOne().sort({ id: -1 }).select('id').lean();
    const nuevo = await Product.create({ ...data, id: (last?.id || 0) + 1 });
    invalidate();
    res.status(201).json(nuevo);
});

router.put('/:id', requireAuth(ROLES.ADMIN), async (req, res) => {
    const act = await Product.findOneAndUpdate(
        { id: Number(req.params.id) }, sanitize(req.body), { returnDocument: 'after', runValidators: true }
    );
    if (!act) throw new HttpError(404, 'Producto no encontrado');
    invalidate();
    res.json(act);
});

// Marcar agotado / disponible (lo puede hacer caja durante el servicio)
router.patch('/:id/disponible', requireAuth(ROLES.ADMIN, ROLES.CAJERO), async (req, res) => {
    const act = await Product.findOneAndUpdate(
        { id: Number(req.params.id) }, { disponible: Boolean(req.body?.disponible) }, { returnDocument: 'after' }
    );
    if (!act) throw new HttpError(404, 'Producto no encontrado');
    invalidate();
    res.json(act);
});

router.delete('/:id', requireAuth(ROLES.ADMIN), async (req, res) => {
    await Product.findOneAndDelete({ id: Number(req.params.id) });
    invalidate();
    res.json({ message: 'Eliminado' });
});

module.exports = router;
