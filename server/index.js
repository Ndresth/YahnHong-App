require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); 
const jwt = require('jsonwebtoken');

// Modelos
const Order = require('./models/OrderModel');
const Product = require('./models/ProductModel');
const Cierre = require('./models/CierreModel'); // Nuevo
const Gasto = require('./models/GastoModel');   // Nuevo

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "YahnHongSecretKey2024"; // Llave secreta interna

// TU URL DE MONGO (Manteniendo la de Yahn Hong)
const MONGO_URI = "mongodb+srv://admin:admin123@cluster0.mcuxxcx.mongodb.net/yahnhong?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Yahn Hong DB Conectada'))
    .catch(err => console.error('🔴 Error Mongo:', err));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- MIDDLEWARE DE SEGURIDAD ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "Token requerido" });
    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) { return res.status(401).json({ message: "Token inválido" }); }
};

// --- LOGIN (Roles) ---
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    // Contraseñas hardcodeadas para el ejemplo
    if (password === 'Yami1') { // Admin
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'admin' });
    } else if (password === 'caja123') { // Cajero
        const token = jwt.sign({ role: 'cajero' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'cajero' });
    } else if (password === 'pos123') { // Mesera/POS
        const token = jwt.sign({ role: 'mesera' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'mesera' });
    } else {
        res.status(401).json({ message: "Credenciales incorrectas" });
    }
});

// --- RUTAS PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    const productos = await Product.find().sort({ id: 1 }); res.json(productos);
});
app.post('/api/productos', verifyToken, async (req, res) => {
    const nuevo = new Product(req.body); await nuevo.save(); res.json(nuevo);
});
app.put('/api/productos/:id', verifyToken, async (req, res) => {
    await Product.findOneAndUpdate({ id: req.params.id }, req.body); res.json({msg:'ok'});
});
app.delete('/api/productos/:id', verifyToken, async (req, res) => {
    await Product.findOneAndDelete({ id: req.params.id }); res.json({msg:'ok'});
});

// --- RUTAS PEDIDOS ---
app.post('/api/orders', async (req, res) => {
    const nueva = new Order(req.body); await nueva.save(); res.json(nueva);
});
app.get('/api/orders', async (req, res) => {
    // Solo trae las pendientes y que NO estén cerradas
    const ordenes = await Order.find({ estado: 'Pendiente', cierre_id: null }).sort({ fecha: -1 });
    res.json(ordenes);
});
app.put('/api/orders/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, req.body); res.json({msg:'ok'});
});

// --- GASTOS ---
app.post('/api/gastos', verifyToken, async (req, res) => {
    const nuevo = new Gasto(req.body); await nuevo.save(); res.json(nuevo);
});
app.get('/api/gastos/hoy', async (req, res) => {
    const gastos = await Gasto.find({ cierre_id: null }).sort({ fecha: -1 }); res.json(gastos);
});
app.delete('/api/gastos/:id', verifyToken, async (req, res) => {
    await Gasto.findByIdAndDelete(req.params.id); res.json({message: 'Eliminado'});
});

// --- FINANZAS Y CIERRE DE CAJA ---
app.get('/api/ventas/hoy', async (req, res) => {
    const ordenes = await Order.find({ cierre_id: null });
    const totalVentas = ordenes.reduce((acc, o) => acc + o.total, 0);
    const gastos = await Gasto.find({ cierre_id: null });
    const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
    res.json({ totalVentas, totalGastos, totalCaja: totalVentas - totalGastos, cantidadPedidos: ordenes.length });
});

app.post('/api/ventas/cerrar', verifyToken, async (req, res) => {
    try {
        const { efectivoReal } = req.body;
        const ordenes = await Order.find({ cierre_id: null });
        const gastos = await Gasto.find({ cierre_id: null });

        if (ordenes.length === 0 && gastos.length === 0) return res.status(400).json({ message: "Nada para cerrar" });

        const totalVentas = ordenes.reduce((acc, o) => acc + o.total, 0);
        const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);
        const teorico = totalVentas - totalGastos;

        const cierre = new Cierre({
            fechaInicio: new Date(), 
            totalVentasSistema: totalVentas,
            totalGastos: totalGastos,
            totalCajaTeorico: teorico,
            totalEfectivoReal: Number(efectivoReal),
            diferencia: Number(efectivoReal) - teorico,
            cantidadPedidos: ordenes.length,
            usuario: "Admin"
        });
        const guardado = await cierre.save();

        // Marcar ordenes y gastos como cerrados
        await Order.updateMany({ cierre_id: null }, { $set: { cierre_id: guardado._id } });
        await Gasto.updateMany({ cierre_id: null }, { $set: { cierre_id: guardado._id } });

        res.json({ message: "Cierre exitoso", reporte: guardado });
    } catch (e) { res.status(500).json({ message: "Error interno" }); }
});

app.get('/api/cierres', verifyToken, async (req, res) => {
    const cierres = await Cierre.find().sort({ fechaFin: -1 }).limit(30);
    res.json(cierres);
});

// --- FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

app.listen(PORT, () => console.log(`[YAHN HONG] Server en puerto ${PORT}`));