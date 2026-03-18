# Reto Tecnico - Backend

API REST para tienda de productos con carrito de compras. Construida con Node.js, Express y PostgreSQL.

## Requisitos previos

- Node.js (v18 o superior)
- PostgreSQL (v14 o superior)

## Instalacion

1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd backend
```

2. Instalar dependencias

```bash
npm install
```

3. Crear la base de datos en PostgreSQL

```sql
CREATE DATABASE "reto-base";
```

4. Configurar variables de entorno

Crear un archivo `.env` en la raiz del proyecto:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reto-base
DB_USER=postgres
DB_PASSWORD=tu_contraseña

JWT_SECRET=tu_clave_secreta

PORT=3001
```

5. Iniciar el servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Produccion
npm start
```

Las tablas se crean automaticamente al iniciar el servidor. Tambien se crea un usuario por defecto:

- **Email:** demo@demo.com
- **Password:** 123456

## Estructura del proyecto

```
src/
├── controllers/       # Logica HTTP y respuestas
│   ├── authController.js
│   ├── cartController.js
│   └── productController.js
├── models/            # Acceso a datos (queries SQL)
│   ├── userModel.js
│   ├── orderModel.js
│   └── orderItemModel.js
├── middleware/         # Middlewares (autenticacion JWT)
│   └── auth.js
├── routes/            # Definicion de endpoints
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   └── productRoutes.js
├── db/
│   └── database.js    # Conexion PostgreSQL e inicializacion
└── index.js           # Entry point
```

## Endpoints

### Autenticacion

| Metodo | Ruta              | Descripcion         |
|--------|-------------------|----------------------|
| POST   | /api/auth/register | Registrar usuario   |
| POST   | /api/auth/login    | Iniciar sesion      |

**Registro:**
```json
POST /api/auth/register
{
  "nombre": "Juan",
  "email": "juan@correo.com",
  "password": "123456"
}
```

**Login:**
```json
POST /api/auth/login
{
  "email": "juan@correo.com",
  "password": "123456"
}
```

Ambos retornan un `token` JWT que se debe enviar en las rutas protegidas.

### Productos

| Metodo | Ruta           | Descripcion                  |
|--------|----------------|------------------------------|
| GET    | /api/products  | Listar productos (API externa)|

### Carrito (requiere token)

Enviar el header: `Authorization: Bearer <token>`

| Metodo | Ruta                          | Descripcion                |
|--------|-------------------------------|----------------------------|
| POST   | /api/cart                     | Agregar producto al carrito|
| GET    | /api/cart                     | Obtener carrito del usuario|
| DELETE | /api/cart/product/:idProducto | Eliminar producto del carrito|

**Agregar al carrito:**
```json
POST /api/cart
{
  "idProducto": 1,
  "sku": "RCH45Q1N",
  "precio": 9.99
}
```

## Modelo de datos

- **usuario** - id_usuario, nombre, email, password
- **orden** (carrito) - id_carrito, id_usuario, fecha_creacion, fecha_actualizacion, total_compra
- **orden_items** - id_detalle, id_carrito, id_producto, sku, precio

## Tecnologias

- Node.js + Express
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- bcryptjs
- dotenv
