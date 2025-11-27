require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const Order = require('./models/OrderModel');

// Importamos el modelo
const Product = require('./models/ProductModel');

const app = express();
const PORT = process.env.PORT || 3000;

// TU URL DE MONGO
// SEGURIDAD: Leemos la variable del entorno (Nube) o usamos una local si estamos en PC
const MONGO_URI = process.env.MONGO_URI;

// --- 1. CONEXIÓN A BASE DE DATOS ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Servidor conectado a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error conectando a Mongo:', err));

// Middleware
app.use(cors());

// --- AQUÍ ESTÁ EL CAMBIO (Límite aumentado) ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// ----------------------------------------------

// --- 2. RUTAS PÚBLICAS (IMÁGENES) ---
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- 3. API ROUTES (CRUD) ---

// GET: Obtener todos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Product.find().sort({ id: 1 });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener productos", error });
    }
});

// POST: Crear producto
app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = new Product(req.body);
        await nuevoProducto.save();
        res.status(201).json(nuevoProducto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Actualizar producto (Necesario para Editar)
app.put('/api/productos/:id', async (req, res) => {
    try {
        const actualizado = await Product.findOneAndUpdate(
            { id: req.params.id }, 
            req.body, 
            { new: true } // Devuelve el dato actualizado
        );
        res.json(actualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Eliminar producto (Necesario para Borrar)
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 1. GUARDAR NUEVO PEDIDO (Desde POS o Cliente)
app.post('/api/orders', async (req, res) => {
    try {
        const nuevaOrden = new Order(req.body);
        await nuevaOrden.save();
        res.status(201).json(nuevaOrden);
    } catch (error) {
        res.status(400).json({ message: "Error al guardar pedido", error });
    }
});

// 2. VER PEDIDOS PENDIENTES (Para la Caja)
app.get('/api/orders', async (req, res) => {
    try {
        // Traemos los pendientes, del más nuevo al más viejo
        const ordenes = await Order.find({ estado: 'Pendiente' }).sort({ fecha: -1 });
        res.json(ordenes);
    } catch (error) {
        res.status(500).json({ message: "Error al leer pedidos", error });
    }
});

// 3. MARCAR COMO COMPLETADO (Para borrar de la lista)
app.put('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' });
        res.json({ message: 'Orden completada' });
    } catch (error) {
        res.status(500).json({ message: "Error", error });
    }
});

// --- 4. INTEGRACIÓN CON FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));

// Manejo de rutas para React
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR PUNTO CHINO CORRIENDO EN PUERTO ${PORT} ---`);
});