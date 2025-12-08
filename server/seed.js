require('dotenv').config(); // <--- Cargar variables de entorno
const mongoose = require('mongoose');
const Product = require('./models/ProductModel');
const menuData = require('./menu.json');

// CAMBIO DE SEGURIDAD:
// Usamos process.env.MONGO_URI en lugar de escribir el link directo.
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("🔴 Error Fatal: No se encontró la variable MONGO_URI en el archivo .env");
  console.error("Asegúrate de crear el archivo .env en la carpeta server/ con tu link de conexión.");
  process.exit(1);
}

const seedDB = async () => {
  try {
    // 1. Conectar usando la variable segura
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas (Yahn Hong Seed)');

    // 2. Limpiar datos antiguos
    await Product.deleteMany({});
    console.log('🧹 Base de datos limpiada');

    // 3. Insertar datos nuevos
    await Product.insertMany(menuData);
    console.log('🚀 ¡Menú de Yahn Hong cargado exitosamente!');

    process.exit();
  } catch (err) {
    console.error('❌ Error al cargar datos:', err);
    process.exit(1);
  }
};

seedDB();