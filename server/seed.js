require('dotenv').config(); // Cargar variables de entorno
const mongoose = require('mongoose');
const Product = require('./models/ProductModel');
const menuData = require('./menu.json');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Error: Falta MONGO_URI en el archivo .env");
  process.exit(1);
}

// Protección: este script BORRA todo el menú actual
if (!process.argv.includes('--force')) {
  console.error("⚠️  Este script borra TODOS los productos y carga menu.json.");
  console.error("   Si está seguro, ejecute: node seed.js --force");
  process.exit(1);
}

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas (Seed)');

    await Product.deleteMany({});
    console.log('🧹 Datos previos borrados');

    await Product.insertMany(menuData);
    console.log('🚀 ¡Menú de Yahn Hong cargado exitosamente!');

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedDB();
