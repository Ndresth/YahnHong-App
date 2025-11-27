### Yahn Hong - Web de Domicilios
Yahn Hong es una aplicación web Full Stack diseñada para modernizar la experiencia de pedidos del restaurante. Permite a los usuarios explorar un menú digital interactivo, filtrar platos por categorías, gestionar un carrito de compras dinámico y finalizar el pedido automáticamente a través de WhatsApp.

### Características Principales
Menú Digital Interactivo: Visualización de productos con imágenes reales y precios actualizados.

Filtrado Inteligente: Navegación fluida por categorías (Arroces, Chop Suey, Bebidas, etc).

### Carrito de Compras (Sidebar):

Agrega y elimina productos sin recargar la página.

Contador de unidades y cálculo automático del total.

Detalle de Producto Rápido: Vista previa del producto con selección de cantidad antes de agregar.

Checkout vía WhatsApp: Formulario de datos del cliente que genera un mensaje detallado y formateado listo para enviar al restaurante.

Diseño Responsivo: Interfaz moderna y adaptable a móviles y escritorio.

### Tecnologías Utilizadas
Frontend (Cliente)
React 18: Librería principal para la interfaz.
Vite: Empaquetador rápido y ligero.
Bootstrap 5: Sistema de rejillas y componentes base.
CSS Personalizado: Estilos modernos 
React Router DOM: Manejo de rutas.


Backend (Servidor)
Node.js: Entorno de ejecución.
Express: Framework para crear la API REST.
CORS: Gestión de permisos de acceso.
Gestión de Archivos Estáticos: Servidor de imágenes optimizado.

### Estructura del Proyecto
El proyecto sigue una arquitectura monorepo separada en dos carpetas principales:

/server: Contiene la API, el archivo menu.json (Base de datos) y la carpeta de imágenes públicas.
/client: Contiene la aplicación React (Frontend), componentes, contexto y estilos.

### Instrucciones de Instalación y Ejecución
Sigue estos pasos para correr el proyecto en tu entorno local:

1. Clonar el Repositorio
git clone https://github.com/Ndresth/PuntoChino-App.git cd PuntoChino-App

2. Configurar y Correr el Backend (Puerto 3000)
Abre una terminal y ejecuta:

cd server npm install node index.js

(El servidor estará escuchando en http://localhost:3000)

3. Configurar y Correr el Frontend (Puerto 5173)
Abre una segunda terminal (sin cerrar la anterior) y ejecuta:

cd client npm install npm run dev

(Abre tu navegador en la URL que te muestre, usualmente http://localhost:5173)

Desarrollado por: Yamith Lobo