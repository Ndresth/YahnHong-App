const mongoose = require('mongoose');
const Product = require('./models/ProductModel');
const menuData = require('./menu.json');

// TU URL DE MONGO (Sacada de tu imagen)
const MONGO_URI = "mongodb+srv://admin:admin123@cluster0.mcuxxcx.mongodb.net/yahnhong?retryWrites=true&w=majority&appName=Cluster0";

const seedDB = async () => {
  try {
    // 1. Conectar
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // 2. Limpiar (Borrar datos viejos para no duplicar)
    await Product.deleteMany({});
    console.log('🧹 Base de datos limpiada');

    // 3. Insertar (Subir el menú nuevo)
    await Product.insertMany(menuData);
    console.log('🚀 ¡Menú subido exitosamente a la nube!');

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedDB();