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
const Cierre = require('./models/CierreModel');
const Gasto = require('./models/GastoModel');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN SEGURA (VARIABLES DE ENTORNO) ---
// Ahora busca las variables en el archivo .env
const SECRET_KEY = process.env.JWT_SECRET; 
const MONGO_URI = process.env.MONGO_URI;

// Validación para evitar que el servidor arranque si faltan las claves
if (!MONGO_URI) {
  console.error("🔴 Error Fatal: Falta la variable MONGO_URI en el archivo .env");
  process.exit(1);
}

if (!SECRET_KEY) {
    console.warn("⚠️ Advertencia: No se encontró JWT_SECRET en .env, usando clave por defecto insegura.");
}

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
        // Usamos la clave segura o un fallback temporal (no recomendado para prod)
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY || "fallback_secret");
        req.user = decoded;
        next();
    } catch (err) { return res.status(401).json({ message: "Token inválido" }); }
};

// --- LOGIN (Roles con Variables de Entorno) ---
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    
    // Validamos contra las variables del archivo .env
    // Asegúrate de definir estas variables en tu .env también
    if (password === process.env.ADMIN_PASSWORD) { // Admin
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY || "fallback_secret", { expiresIn: '24h' });
        res.json({ token, role: 'admin' });
    } else if (password === process.env.CAJERO_PASSWORD) { // Cajero
        const token = jwt.sign({ role: 'cajero' }, SECRET_KEY || "fallback_secret", { expiresIn: '24h' });
        res.json({ token, role: 'cajero' });
    } else if (password === process.env.POS_PASSWORD) { // Mesera/POS
        const token = jwt.sign({ role: 'mesera' }, SECRET_KEY || "fallback_secret", { expiresIn: '24h' });
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
    const nuevo =