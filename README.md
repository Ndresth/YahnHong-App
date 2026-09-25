# Yahn Hong — POS, Cocina y Menú Web

Sistema para restaurante: menú público con pedidos por WhatsApp, POS para meseras, pantalla de cocina en tiempo real y caja con arqueo, gastos, reportes y Excel.

## Módulos

| Ruta | Quién | Qué hace |
|---|---|---|
| `/` | Clientes | Menú con buscador, indicador **Abierto/Cerrado**, carrito con **Domicilio** o **Recoger en el local**, "lo antes posible" o **a una hora** de hoy. El pedido queda registrado y se envía por WhatsApp |
| `/pos` | Admin, cajero, mesera | Menú a la izquierda y cuenta fija a la derecha. Un toque en el tamaño agrega el producto. Mesas en cuadrícula (las ocupadas se ven en naranja), para llevar o domicilio y método de pago |
| `/cocina` | Todos los roles | Órdenes en vivo con cronómetro (amarillo a los 10 min, rojo a los 20), flujo Pendiente → Preparando → Listo → Entregado, sonido e impresión automática opcional. Los pedidos **programados** esperan en una franja aparte y entran a la fila 30 min antes de su hora |
| `/admin` | Admin, cajero | Resumen del turno, desglose por método de pago, gastos, órdenes del turno (reimprimir, corregir pago, anular), productos agotados, arqueo y cierre, impresora y **Ajustes** (días cerrados). El admin además tiene inventario completo, **Reportes**, usuarios y respaldo |

## Adiciones y pago dividido (POS)

- **Adicionar a un pedido en cocina:** al tocar una mesa ocupada aparece "Adicionar a #N"; para llevar o domicilio, botón **Adicionar a un pedido que ya está en cocina**. Los productos nuevos suman al total, la orden vuelve a cocina si ya estaba lista o entregada, y en cocina se resaltan con la hora de la adición (sonido y comanda "ADICIÓN" solo con lo nuevo).
- **Pago dividido:** en el POS, **Dividir pago entre varios métodos** (hasta 4); en Caja → Órdenes, opción **Dividir pago…** en la columna Pago. La última parte se calcula sola. Cada parte suma a su método en caja, cierre, reportes y Excel. Si a una orden con pago dividido se le adiciona, el pago queda en el método de mayor valor y caja debe ajustarlo.
- **Categorías solo POS:** `categoriasSoloPos` en `shared/config.json` (hoy: **Cajas** — Caja C1 $500, Caja J1 $1.000). Se venden en el POS pero no salen en el menú web ni se pueden pedir desde la web.

## Horario de atención

Se define en `shared/config.json` (lo usan servidor y cliente) y se valida en el servidor (`server/lib/horario.js`):

- Todos los días 11:30 a. m. – 8:00 p. m., domingos y **festivos de Colombia** incluidos. Los festivos se calculan solos (Ley Emiliani y Semana Santa); si algún día cambia el horario de domingos o festivos se edita `domingoFestivo`.
- Abierto: el cliente pide "lo antes posible" o programa una hora hasta el cierre. Antes de abrir solo puede programar para hoy. Después del cierre no se reciben pedidos web.
- **Caja → Ajustes → Días sin pedidos web**: "Cerrar pedidos web por hoy" o programar días especiales (24 y 31 de diciembre, imprevistos).
- El POS no tiene restricción de horario.

## Reportes (admin)

**Caja → Reportes**: semana, mes o rango de fechas, con comparación contra el periodo anterior, ventas por día, métodos de pago, tipo de pedido, horas de más venta, productos más vendidos y tabla por día. Al tocar un día se ve su detalle (órdenes, productos, gastos). Se calcula por la fecha de cada orden: el cierre de caja no borra nada.

## Desechables

En el carrito del POS y del menú web hay un bloque **Desechables**:
- Cucharas: gratis, máximo 6.
- Platos: $300 c/u, máximo 10 (se suman al total).
- Vasos: gratis, máximo 6. Sólo aparecen si el pedido tiene un producto de la categoría **Bebidas**.

Precios y límites se configuran en `shared/config.json` y se validan en el servidor (`server/lib/desechables.js`).

## Cierre de caja

**Caja → Arqueo y cierre** abre un asistente de 4 pasos:

1. **Resumen:** ventas por método y efectivo esperado. Avisa si quedan órdenes en cocina.
2. **Efectivo:** se escribe el total de efectivo que hay en la caja.
3. **Confirmar:** muestra si cuadra, sobra o falta.
4. **Excel obligatorio:** al cerrar se descarga `Cierre_AAAA-MM-DD.xlsx` (hojas Resumen, Ventas, Productos y Gastos). No se puede terminar sin descargarlo; si se recarga la página, el asistente vuelve a este paso. También permite imprimir el resumen del cierre en la térmica.

## Acceso del personal

El menú público no muestra ningún botón de acceso. El personal entra escribiendo `/login` al final de la dirección (por ejemplo `https://<tu-app>.onrender.com/login`).

- **Usuarios individuales** (recomendado): **Caja → Ajustes → Usuarios del personal**. Cada persona entra con su nombre y su clave, y queda registrado quién tomó, anuló o cerró. Desactivar a alguien o cambiarle la clave cierra sus sesiones al instante.
- **Claves compartidas por rol** (variables de entorno): siguen funcionando. Con el interruptor **Solo usuarios individuales** dejan de servir, salvo la del admin (para no quedar por fuera).

## Variables de entorno (Render → Environment)

Ver `server/.env.example`.

| Variable | Obligatoria | Nota |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión de Atlas |
| `JWT_SECRET` | Sí | **Mínimo 32 caracteres aleatorios**. Si se cambia, todos deben volver a iniciar sesión |
| `ADMIN_PASSWORD`, `CAJERO_PASSWORD`, `MESERA_PASSWORD` | Sí | Una por rol |
| `COCINA_PASSWORD` | No | Crea el rol "cocina", que sólo ve `/cocina` |
| `CORS_ORIGIN` | No | Sólo si el frontend vive en otro dominio |

## Despliegue en Render

- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

El plan gratuito se duerme tras 15 minutos sin tráfico. El menú muestra la última copia guardada en el navegador mientras el servidor despierta. Para evitar que se duerma, configure un monitor gratuito (por ejemplo UptimeRobot) que haga ping a `/api/health` cada 10 minutos: un solo servicio 24/7 gasta ~730 h, dentro de las 750 h gratuitas al mes.

## Impresión (térmica 58/80 mm)

En **Caja → Impresora** de cada equipo se elige el ancho del papel, las copias y la impresión automática, y hay botones de prueba.

- En el cuadro de impresión: Márgenes **Ninguno**, Escala **100%** y sin encabezados ni pies de página.
- Para imprimir sin el cuadro de diálogo (ideal en cocina): acceso directo de Chrome con `--kiosk-printing` y la térmica como impresora predeterminada.
- Active la impresión automática en **un solo** equipo, o saldrán comandas duplicadas.

## Respaldos

El plan gratuito de Atlas **no hace copias de seguridad**.

- **Manual:** Caja → Ajustes → **Descargar respaldo completo** (JSON con menú, pedidos, cierres, gastos, ajustes y usuarios). Guárdelo fuera del computador del local; tiene datos de clientes.
- **Automático semanal (GitHub Actions):** `.github/workflows/respaldo.yml` corre los lunes 6:00 a. m. Requiere dos secretos en GitHub → Settings → Secrets and variables → Actions: `MONGO_URI` y `BACKUP_PASSWORD` (una clave larga que usted guarde aparte). Como el repositorio es público, el archivo se sube **cifrado** y se conserva 90 días en Actions → *Respaldo semanal* → Artifacts. Para descifrarlo:
  ```bash
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in respaldo-AAAA-MM-DD.json.gz.enc -pass pass:SU_CLAVE | gunzip > respaldo.json
  ```
  GitHub pausa los workflows programados si el repositorio pasa 60 días sin cambios; se reactivan desde la pestaña Actions.
- **Restaurar:** `cd server && node scripts/restaurar.js respaldo.json --confirmar` (reemplaza por `_id` sin borrar lo demás; `--reemplazar` vacía cada colección antes). Escribe en la BD de `MONGO_URI`: úselo con cuidado.
- **Nunca** ejecute `node seed.js --force` sobre la BD real: borra el menú.

## Salud del servicio

`/api/health` responde **503** si el servidor no tiene conexión con MongoDB (UptimeRobot avisa). Si Atlas no responde al arrancar, el servidor reintenta la conexión cada vez con más espera (hasta 60 s).

## Seguridad

- El servidor calcula **todos** los precios y totales con la base de datos; el navegador sólo envía producto, tamaño y cantidad.
- Cada endpoint valida el rol en el servidor (antes sólo se validaba en el frontend).
- Límite de intentos: login 10 fallos cada 15 min por IP; pedidos web 8 cada 10 min por IP.
- Cabeceras de seguridad con Helmet (incluye CSP) y cuerpo máximo de 100 KB.
- Todo lo que se imprime se escapa (evita inyectar HTML o scripts desde un pedido web).

## Pruebas y CI

- `cd server && npm test`: pruebas del servidor (precios, desechables, horario y festivos, Recoger/hora programada, usuarios y sesiones, reportes, respaldo). No necesitan base de datos.
- `.github/workflows/ci.yml` corre en cada PR y en `main`: pruebas del servidor, lint y build del cliente.

## Configuración compartida

`shared/config.json`: desechables (precios, límites) y horario. Lo leen el servidor (validación) y el cliente (pantallas); se edita en un solo lugar.

## Desarrollo local

```bash
npm run build          # instala server y client y compila el frontend
cp server/.env.example server/.env   # y complete los valores
npm start              # http://localhost:3000
# Frontend con recarga en caliente: cd client && npm run dev
```

`node server/seed.js --force` **borra** el menú y lo recarga desde `server/menu.json`.
