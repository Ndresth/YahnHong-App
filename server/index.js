require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); 

const Order = require('./models/OrderModel');
const Product = require('./models/ProductModel');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Servidor conectado a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error conectando a Mongo:', err));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- API PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Product.find().sort({ id: 1 });
        res.json(productos);
    } catch (error) { res.status(500).json({ message: "Error", error }); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = new Product(req.body);
        await nuevoProducto.save();
        res.status(201).json(nuevoProducto);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const actualizado = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(actualizado);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Producto eliminado' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- API PEDIDOS ---
app.post('/api/orders', async (req, res) => {
    try {
        const nuevaOrden = new Order(req.body);
        await nuevaOrden.save();
        res.status(201).json(nuevaOrden);
    } catch (error) { res.status(400).json({ message: "Error al guardar", error }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const ordenes = await Order.find({ estado: 'Pendiente' }).sort({ fecha: -1 });
        res.json(ordenes);
    } catch (error) { res.status(500).json({ message: "Error al leer", error }); }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' });
        res.json({ message: 'Orden completada' });
    } catch (error) { res.status(500).json({ message: "Error", error }); }
});

// --- ZONA FINANCIERA ---

// 1. VER VENTAS HOY
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const ordenes = await Order.find({});
        const totalVentas = ordenes.reduce((acc, orden) => acc + orden.total, 0);
        
        res.json({ total: totalVentas, cantidadPedidos: ordenes.length });
    } catch (error) {
        res.status(500).json({ message: "Error calculando ventas", error });
    }
});

// 2. DESCARGAR EXCEL (CORREGIDO: Incluye tamaño)
app.get('/api/ventas/excel', async (req, res) => {
    try {
        const ordenes = await Order.find().lean();

        // Calcular el Gran Total
        const granTotal = ordenes.reduce((acc, o) => acc + o.total, 0);

        const datosExcel = ordenes.map(o => ({
            Fecha: new Date(o.fecha).toLocaleString('es-CO'),
            Cliente: o.cliente.nombre,
            MetodoPago: o.cliente.metodoPago,
            // --- CORRECCIÓN AQUÍ: Agregamos el tamaño al nombre ---
            Productos: o.items.map(i => `${i.cantidad}x ${i.nombre} ${i.tamaño && i.tamaño !== 'unico' ? `(${i.tamaño})` : ''}`).join(', '),
            // -----------------------------------------------------
            Total: o.total
        }));

        // --- FILA DE TOTAL AL FINAL ---
        datosExcel.push({
            Fecha: '',
            Cliente: '--- TOTAL CIERRE ---',
            MetodoPago: '',
            Productos: '',
            Total: granTotal
        });

        const workSheet = XLSX.utils.json_to_sheet(datosExcel);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Ventas");

        const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename=Cierre_Caja.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);

    } catch (error) {
        res.status(500).send("Error generando Excel");
    }
});

// 3. CERRAR CAJA
app.delete('/api/ventas/cerrar', async (req, res) => {
    try {
        console.log("Borrando base de datos de pedidos...");
        await Order.deleteMany({}); 
        console.log("Base de datos limpia.");
        res.json({ message: "Caja cerrada correctamente" });
    } catch (error) {
        res.status(500).json({ message: "Error cerrando caja", error });
    }
});

// --- FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR CORRIENDO EN PUERTO ${PORT} ---`);
});