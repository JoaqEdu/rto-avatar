# Reto Tecnico - Backend

API REST para tienda de productos con carrito de compras. Construida con Node.js, Express, Sequelize y PostgreSQL.

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

Las tablas se crean automaticamente al iniciar el servidor (Sequelize sync). Tambien se crea un usuario por defecto:

- **Email:** demo@demo.com
- **Password:** 123456

## Arquitectura del proyecto

El proyecto sigue una **arquitectura por capas** con separacion de responsabilidades:

```
src/
├── controllers/       # Capa HTTP: request/response
│   ├── authController.js
│   ├── cartController.js
│   └── productController.js
├── services/          # Capa de LOGICA DE NEGOCIO
│   ├── authService.js      # Registro, login, JWT
│   ├── cartService.js      # Operaciones del carrito
│   └── productService.js   # Consumo API externa
├── models/            # Capa de DATOS: Modelos Sequelize
│   ├── User.js             # Modelo Usuario
│   ├── Order.js            # Modelo Orden (carrito)
│   ├── OrderItem.js        # Modelo Items del carrito
│   └── index.js            # Relaciones y exports
├── routes/            # Definicion de endpoints
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   └── productRoutes.js
├── middleware/        # Middlewares
│   └── auth.js             # Verificacion JWT
├── db/
│   └── sequelize.js        # Conexion Sequelize a PostgreSQL
└── index.js           # Entry point
```

### Flujo de datos

```
Request → Routes → Controllers → Services → Models → Database
                        ↓
                   Response
```

- **Controllers**: Solo manejan HTTP (extraer datos del request, llamar al service, enviar response)
- **Services**: Contienen la logica de negocio (validaciones, reglas, transformaciones)
- **Models**: Definen la estructura de datos con Sequelize (atributos, relaciones)

## Modelos Sequelize

### User
```javascript
{
  id_usuario: INTEGER (PK, autoIncrement),
  nombre: STRING,
  email: STRING (unique),
  password: STRING
}
```

### Order (Carrito)
```javascript
{
  id_carrito: INTEGER (PK, autoIncrement),
  id_usuario: INTEGER (FK -> User),
  fecha_creacion: DATE,
  fecha_actualizacion: DATE,
  total_compra: DECIMAL(10,2)
}
```

### OrderItem
```javascript
{
  id_detalle: INTEGER (PK, autoIncrement),
  id_carrito: INTEGER (FK -> Order),
  id_producto: INTEGER,
  sku: STRING,
  precio: DECIMAL(10,2)
}
```

### Relaciones
- User hasMany Order
- Order belongsTo User
- Order hasMany OrderItem
- OrderItem belongsTo Order

## Endpoints

### Autenticacion (publicas)

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

### Productos (publica)

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

## Tecnologias

- Node.js + Express 5
- PostgreSQL + Sequelize ORM
- JWT (jsonwebtoken)
- bcryptjs
- dotenv
