# Reto Tecnico - Tienda de Productos con Carrito de Compras

Aplicacion fullstack que consume la API de [dummyjson.com/products](https://dummyjson.com/products) y simula un carrito de compras con autenticacion de usuarios.

**Stack:** Node.js + Express + PostgreSQL (backend) | React + Vite (frontend)

---

# PARTE 1: BACKEND (paso a paso)

## 1.1 Creacion del proyecto

Iniciamos el proyecto de Node.js desde cero:

```bash
mkdir backend
cd backend
npm init -y
```

Esto genera el `package.json` base. Luego instalamos las dependencias necesarias:

```bash
npm install express cors pg dotenv bcryptjs jsonwebtoken
```

Que hace cada una:

| Paquete        | Para que sirve                                                     |
|----------------|--------------------------------------------------------------------|
| `express`      | Framework web para crear el servidor y las rutas de la API         |
| `cors`         | Permite que el frontend (otro puerto) se comunique con el backend  |
| `pg`           | Driver para conectarnos a PostgreSQL desde Node.js                 |
| `dotenv`       | Carga variables de entorno desde un archivo `.env`                 |
| `bcryptjs`     | Hashea las contraseñas antes de guardarlas en la base de datos     |
| `jsonwebtoken` | Genera y verifica tokens JWT para la autenticacion                 |

## 1.2 Estructura de carpetas

Organizamos el codigo siguiendo una **arquitectura por capas** (Routes - Controllers - Services - Models):

```
backend/
├── src/
│   ├── index.js               # Punto de entrada: levanta el servidor
│   ├── db/
│   │   └── sequelize.js       # Conexion Sequelize a PostgreSQL
│   ├── models/                # Capa de DATOS: Modelos Sequelize
│   │   ├── User.js            # Modelo de usuario
│   │   ├── Order.js           # Modelo de orden (carrito)
│   │   ├── OrderItem.js       # Modelo de items del carrito
│   │   └── index.js           # Relaciones y exports
│   ├── services/              # Capa de LOGICA DE NEGOCIO
│   │   ├── authService.js     # Registro, login, generacion JWT
│   │   ├── cartService.js     # Operaciones del carrito
│   │   └── productService.js  # Consumo de API externa
│   ├── controllers/           # Capa HTTP: request/response
│   │   ├── authController.js  # Maneja peticiones de auth
│   │   ├── cartController.js  # Maneja peticiones del carrito
│   │   └── productController.js # Maneja peticiones de productos
│   ├── routes/                # Capa de RUTAS: define los endpoints
│   │   ├── authRoutes.js      # POST /register, POST /login
│   │   ├── cartRoutes.js      # POST, GET, DELETE del carrito
│   │   └── productRoutes.js   # GET /products
│   └── middleware/            # Funciones intermedias
│       └── auth.js            # Verifica el token JWT
├── .env                       # Variables de entorno (NO se sube a git)
├── postman_collection.json    # Coleccion de pruebas Postman
└── package.json
```

**Por que esta separacion por capas?**

Usamos una arquitectura de **4 capas** con separacion de responsabilidades:

- **models/**: Definen la estructura de datos con Sequelize ORM. Solo atributos y relaciones, sin logica.
- **services/**: Contienen la logica de negocio (validaciones, reglas, transformaciones). No conocen HTTP.
- **controllers/**: Solo manejan HTTP: extraen datos del request, llaman al service, envian response. No tienen logica de negocio.
- **routes/**: Solo definen que metodo HTTP va a que controlador. Muy limpias.
- **middleware/**: Funciones que se ejecutan ANTES del controlador (verificar token JWT).

## 1.3 Conexion a PostgreSQL

### Creacion de la base de datos

Primero creamos la base en PostgreSQL (desde pgAdmin o la terminal):

```sql
CREATE DATABASE "reto-base";
```

### Archivo `.env`

Creamos `backend/.env` con las credenciales:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reto-base
DB_USER=postgres
DB_PASSWORD=tu_contraseña

JWT_SECRET=tu_clave_secreta

PORT=3001
```

### Archivo `database.js` - Como funciona la conexion

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'reto-base',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});
```

Usamos `Pool` en lugar de `Client` porque:
- `Pool` mantiene varias conexiones abiertas y las reutiliza (mas eficiente).
- `Client` abre una sola conexion y si se cae, hay que reconectar manualmente.

### Creacion automatica de tablas

Las tablas se crean al iniciar el servidor con `CREATE TABLE IF NOT EXISTS`, asi no necesitas ejecutar scripts SQL manualmente:

```sql
-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario SERIAL PRIMARY KEY,   -- SERIAL = autoincremental
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,       -- UNIQUE = no se puede repetir
  password TEXT NOT NULL            -- Guardamos el hash, nunca la contraseña real
);

-- Tabla de ordenes (carrito)
CREATE TABLE IF NOT EXISTS orden (
  id_carrito SERIAL PRIMARY KEY,
  id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),  -- Foreign Key
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
  total_compra NUMERIC(10,2) NOT NULL DEFAULT 0                -- 10 digitos, 2 decimales
);

-- Tabla de items del carrito
CREATE TABLE IF NOT EXISTS orden_items (
  id_detalle SERIAL PRIMARY KEY,
  id_carrito INTEGER NOT NULL REFERENCES orden(id_carrito),
  id_producto INTEGER NOT NULL,
  sku TEXT,
  precio NUMERIC(10,2) NOT NULL
);
```

### Seed: usuario por defecto

El PDF pide cargar al menos un usuario por defecto. Lo hacemos al iniciar:

```js
const userCount = await pool.query('SELECT COUNT(*) as count FROM usuario');
if (parseInt(userCount.rows[0].count) === 0) {
  const hashedPassword = await bcrypt.hash('123456', 10);
  await pool.query(
    'INSERT INTO usuario (nombre, email, password) VALUES ($1, $2, $3)',
    ['Usuario Demo', 'demo@demo.com', hashedPassword]
  );
}
```

Solo se ejecuta si la tabla esta vacia. La contraseña se hashea con `bcrypt` antes de guardarla.

## 1.4 Entry Point (`index.js`)

```js
require('dotenv').config();  // Carga las variables de .env ANTES que todo
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());             // Permite peticiones desde otro origen (el frontend)
app.use(express.json());     // Parsea el body de las peticiones como JSON

// Montamos las rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// Primero inicializa la BD, luego levanta el servidor
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
```

**Importante:** `dotenv.config()` va en la PRIMERA linea porque los demas archivos (`database.js`, `auth.js`) usan `process.env` y necesitan que las variables ya esten cargadas.

## 1.5 Modelos Sequelize - Capa de datos

Los modelos definen la estructura de datos usando Sequelize ORM. Ejemplo de `User.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const User = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'usuario',
  timestamps: false
});

module.exports = User;
```

**Ventajas de usar Sequelize ORM:**

- Los modelos son clases con atributos definidos (no SQL crudo)
- Queries mas legibles: `User.findOne({ where: { email } })` en lugar de SQL
- Relaciones declarativas: `User.hasMany(Order)`, `Order.belongsTo(User)`
- Validaciones integradas: `allowNull`, `unique`, tipos de datos
- Sequelize genera las queries SQL de forma segura (previene SQL Injection)

## 1.6 Autenticacion (JWT + bcrypt)

### Registro

1. El usuario envia `nombre`, `email` y `password`
2. Verificamos que el email no exista con `userModel.findByEmail(email)`
3. Hasheamos la contraseña: `bcrypt.hash(password, 10)` (el `10` son las rondas de sal)
4. Guardamos el usuario en la BD
5. Generamos un token JWT y lo devolvemos

### Login

1. El usuario envia `email` y `password`
2. Buscamos el usuario por email
3. Comparamos la contraseña: `bcrypt.compare(password, user.password)`
4. Si es correcta, generamos un token JWT y lo devolvemos

### Middleware de autenticacion

Las rutas del carrito estan protegidas. Cada peticion debe incluir el token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

El middleware `auth.js` intercepta la peticion, verifica el token, y si es valido, agrega `req.user` con los datos del usuario (id y email). Si no es valido, responde `401 Unauthorized`.

## 1.7 Services y Controllers

### Services - Logica de negocio

Los services contienen toda la logica de negocio. Los controllers solo llaman a los services.

Ejemplo de `authService.js`:
```js
const registerUser = async (nombre, email, password) => {
  // Verificar si el email ya existe
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, message: 'El email ya está registrado' };
  }

  // Hashear password y crear usuario
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ nombre, email, password: hashedPassword });

  // Generar token JWT
  const token = jwt.sign({ id: user.id_usuario, email }, JWT_SECRET, { expiresIn: '24h' });

  return { user, token };
};
```

### Controllers - Capa HTTP

Los controllers solo manejan request/response:
```js
const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Datos requeridos' });
  }

  try {
    const result = await authService.registerUser(nombre, email, password);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
```

### productService

Consume la API externa `https://dummyjson.com/products` y transforma los datos:

```js
const originalPrice = +(price / (1 - discountPercentage / 100)).toFixed(2);
```

**Formula explicada:**
- Si un producto cuesta `$10` con `20%` de descuento
- Entonces: `precioOriginal = 10 / (1 - 20/100) = 10 / 0.8 = $12.50`
- Verificacion: `12.50 * 0.80 = $10.00` (correcto)

### cartController

**Agregar al carrito:**
1. Obtiene el `id` del usuario desde `req.user` (puesto por el middleware)
2. Busca si el usuario ya tiene un carrito, si no, lo crea
3. Verifica que el producto no este repetido (responde `409 Conflict` si ya existe)
4. Agrega el item y recalcula el total

**Obtener carrito:**
- Busca la orden del usuario y sus items

**Eliminar del carrito:**
- Elimina el item y recalcula el total

## 1.8 Rutas

Las rutas son muy simples, solo conectan URL con controlador:

```js
// authRoutes.js - Publicas (cualquiera puede acceder)
router.post('/register', register);
router.post('/login', login);

// cartRoutes.js - Protegidas (necesitan token)
router.use(authMiddleware);     // Se aplica a TODAS las rutas de abajo
router.post('/', addToCart);
router.get('/', getCart);
router.delete('/product/:idProducto', removeFromCart);
```

`router.use(authMiddleware)` aplica la verificacion de token a todas las rutas del carrito. Asi no tenemos que poner el middleware en cada ruta individual.

## 1.9 Endpoints completos

### Autenticacion (publicas)

| Metodo | Ruta                | Body                                        | Descripcion       |
|--------|---------------------|---------------------------------------------|--------------------|
| POST   | `/api/auth/register`| `{ nombre, email, password }`               | Registrar usuario  |
| POST   | `/api/auth/login`   | `{ email, password }`                       | Iniciar sesion     |

### Productos (publica)

| Metodo | Ruta             | Descripcion                                |
|--------|------------------|--------------------------------------------|
| GET    | `/api/products`  | Lista productos con precio original calculado |

### Carrito (requieren header `Authorization: Bearer <token>`)

| Metodo | Ruta                            | Body                            | Descripcion                 |
|--------|----------------------------------|---------------------------------|-----------------------------|
| POST   | `/api/cart`                      | `{ idProducto, sku, precio }`  | Agregar producto al carrito |
| GET    | `/api/cart`                      | -                               | Obtener carrito del usuario |
| DELETE | `/api/cart/product/:idProducto`  | -                               | Eliminar producto del carrito |

---

# PARTE 2: FRONTEND (paso a paso)

## 2.1 Creacion del proyecto

Creamos el proyecto React con Vite:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

Vite es un bundler moderno, mucho mas rapido que Create React App. Usa ESModules nativos del navegador en desarrollo (no necesita compilar todo cada vez que guardas un cambio).

## 2.2 Estructura de carpetas

```
frontend/
├── src/
│   ├── main.jsx            # Punto de entrada: monta React en el DOM
│   ├── App.jsx             # Componente principal: maneja estado global
│   ├── App.css             # TODOS los estilos de la aplicacion
│   ├── index.css           # Reset CSS y estilos base del body
│   └── components/
│       ├── Auth.jsx        # Pantalla de login / registro
│       ├── ProductList.jsx # Grilla de productos
│       └── Cart.jsx        # Vista del carrito
├── .env                    # Variables de entorno (NO se sube a git)
├── vite.config.js          # Configuracion de Vite
└── package.json
```

## 2.3 Variables de entorno en Vite

Creamos `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

En Vite, las variables de entorno **deben** empezar con `VITE_` para estar disponibles en el codigo del cliente. Se acceden con:

```js
const API_URL = import.meta.env.VITE_API_URL;
```

**Por que no usamos `process.env` como en el backend?** Porque el frontend corre en el navegador, no en Node.js. `import.meta.env` es la forma que Vite inyecta las variables al compilar.

## 2.4 Entry Point (`main.jsx`)

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- `createRoot` busca el div con `id="root"` en `index.html` y monta React ahi.
- `StrictMode` ayuda a detectar problemas durante el desarrollo (renderiza dos veces para encontrar efectos secundarios).

## 2.5 Componente principal (`App.jsx`)

Este es el "cerebro" de la aplicacion. Maneja todo el estado global:

```jsx
const [user, setUser] = useState(null);        // Usuario logueado
const [token, setToken] = useState(null);       // Token JWT
const [products, setProducts] = useState([]);   // Lista de productos
const [cartItems, setCartItems] = useState([]); // Items en el carrito
const [cart, setCart] = useState(null);          // Datos de la orden (total, fechas)
const [loading, setLoading] = useState(true);   // Estado de carga
const [showCart, setShowCart] = useState(false); // Mostrar carrito o productos
```

### Flujo de la aplicacion

```
¿Hay usuario logueado?
├── NO  → Muestra <Auth />         (pantalla de login/registro)
└── SI  → Muestra la tienda
          ├── ¿showCart es true?
          │   └── SI  → Muestra <Cart />
          └── NO → ¿Cargando?
                  ├── SI  → "Cargando productos..."
                  └── NO  → Muestra <ProductList />
```

Esto se logra con renderizado condicional:

```jsx
if (!user) {
  return <Auth onLogin={handleLogin} />;
}

// Dentro del return principal:
{showCart ? (
  <Cart ... />
) : loading ? (
  <p>Cargando productos...</p>
) : (
  <ProductList ... />
)}
```

### Persistencia de sesion

Al hacer login guardamos en `localStorage`:

```js
localStorage.setItem('token', data.token);
localStorage.setItem('user', JSON.stringify(data.user));
```

Al cargar la app, revisamos si ya hay datos guardados:

```js
useEffect(() => {
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  if (savedToken && savedUser) {
    setToken(savedToken);
    setUser(JSON.parse(savedUser));
  }
}, []);
```

El `[]` vacio significa que se ejecuta UNA sola vez cuando el componente se monta.

### Peticiones autenticadas

Toda peticion al carrito lleva el token en el header:

```js
const res = await fetch(`${API_URL}/cart`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

Si el servidor responde `401` (token expirado o invalido), cerramos sesion automaticamente:

```js
if (res.status === 401) {
  handleLogout();  // Limpia localStorage y estados
  return;
}
```

## 2.6 Componente `Auth.jsx` - Login y Registro

Un solo componente maneja ambas pantallas con un estado booleano:

```js
const [isRegister, setIsRegister] = useState(false);
```

- `isRegister = false` → Muestra formulario de login (email + password)
- `isRegister = true` → Muestra formulario de registro (nombre + email + password)

El campo de nombre solo aparece en modo registro:

```jsx
{isRegister && (
  <input type="text" placeholder="Nombre" ... />
)}
```

El endpoint se decide dinamicamente:

```js
const endpoint = isRegister ? '/auth/register' : '/auth/login';
```

Al enviar el formulario, si la respuesta es exitosa, guarda el token en `localStorage` y llama `onLogin()` para que `App.jsx` actualice el estado.

## 2.7 Componente `ProductList.jsx` - Grilla de productos

### Como se deshabilita el boton "Agregar al carrito"

Esta es la logica clave para evitar agregar un producto dos veces:

```jsx
const isInCart = (id) => cartItems.some((item) => item.id_producto === id);
```

`Array.some()` recorre los items del carrito y devuelve `true` si encuentra uno con el mismo `id_producto`. Luego se usa en el boton:

```jsx
<button
  className="add-btn"
  onClick={() => onAddToCart(product)}
  disabled={isInCart(product.id)}        // Si esta en el carrito, el boton se deshabilita
>
  {isInCart(product.id) ? 'En el carrito' : 'Agregar al carrito'}
</button>
```

**Que pasa cuando `disabled={true}`?**
1. El boton no responde a clicks (HTML nativo)
2. El texto cambia de "Agregar al carrito" a "En el carrito"
3. Se aplica el estilo CSS `.add-btn:disabled` que lo pone gris

Esto funciona en tiempo real porque cuando agregas un producto, `App.jsx` llama `fetchCart()` que actualiza `cartItems`, React re-renderiza `ProductList`, y `isInCart()` ahora devuelve `true` para ese producto.

### Doble proteccion (frontend + backend)

Ademas de deshabilitar el boton en el frontend, el backend tambien valida:

```js
// cartController.js
const existing = await orderItemModel.findByCartAndProduct(cart.id_carrito, idProducto);
if (existing) {
  return res.status(409).json({ error: 'El producto ya está en el carrito' });
}
```

Asi aunque alguien envie la peticion directamente (por ejemplo con Postman), el backend no permite duplicados.

## 2.8 Componente `Cart.jsx` - Vista del carrito

Muestra los productos agregados al carrito. Para cada item, busca los datos completos del producto (imagen, nombre) en la lista de productos:

```js
const getProduct = (idProducto) =>
  products.find((p) => p.id === idProducto);
```

**Por que necesitamos esto?** Porque en la base de datos solo guardamos `id_producto`, `sku` y `precio`. Los datos como la imagen y el nombre vienen de la API externa, asi que los buscamos en el array `products` que ya tenemos cargado.

Usa optional chaining (`?.`) por si el producto no se encuentra:

```jsx
<img src={product?.thumbnail || ''} />
<h3>{product?.title || 'Producto'}</h3>
```

El total viene de la base de datos (calculado en el backend):

```jsx
<div className="cart-total">
  Total: $ {Number(cart?.total_compra || 0).toFixed(2)}
</div>
```

`Number()` es necesario porque PostgreSQL con `NUMERIC` devuelve strings.

---

# PARTE 3: ESTILOS CSS (explicacion detallada)

## 3.1 Reset CSS (`index.css`)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

- `*` selecciona TODOS los elementos del DOM.
- `margin: 0; padding: 0;` elimina los margenes y rellenos por defecto del navegador.
- `box-sizing: border-box;` hace que el padding y border se incluyan DENTRO del ancho declarado. Sin esto, un `div` con `width: 200px` y `padding: 20px` mediria `240px`. Con `border-box`, mide `200px` (el contenido se ajusta).

```css
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  color: #333;
}
```

`system-ui` usa la fuente del sistema operativo (Segoe UI en Windows, San Francisco en Mac), asi la app se ve nativa.

## 3.2 Layout principal (`.app` y `.header`)

```css
.app {
  max-width: 1200px;
  margin: 0 auto;    /* Centra el contenedor horizontalmente */
  padding: 20px;
}
```

`margin: 0 auto` es la tecnica clasica para centrar un bloque: `0` arriba/abajo, `auto` izquierda/derecha (divide el espacio sobrante en partes iguales).

```css
.header {
  display: flex;
  justify-content: space-between;  /* Titulo a la izquierda, botones a la derecha */
  align-items: center;             /* Centrado vertical */
  border-bottom: 2px solid #e0e0e0;
}
```

Flexbox con `space-between` es la forma mas limpia de poner elementos en extremos opuestos.

## 3.3 Grilla de productos (`.product-grid`)

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
```

**Esta es la linea mas importante de todo el CSS.** Desglose:

- `display: grid` activa CSS Grid.
- `repeat(auto-fill, ...)` crea tantas columnas como quepan automaticamente.
- `minmax(260px, 1fr)` cada columna mide minimo `260px` y maximo una fraccion del espacio disponible.
- `gap: 20px` espacio entre las tarjetas.

**Resultado:** En pantalla grande se ven 4 columnas, en tablet 3, en movil 1. Todo automatico, sin media queries.

## 3.4 Tarjetas de producto (`.product-card`)

```css
.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;             /* La imagen no se sale de los bordes redondeados */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;  /* Animacion suave */
}

.product-card:hover {
  transform: translateY(-4px);  /* Sube 4px al pasar el mouse */
}
```

- `overflow: hidden` es CLAVE: sin esto, la imagen ignoraria el `border-radius` y se veria con esquinas cuadradas.
- `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` crea una sombra sutil (offset-x, offset-y, blur, color con 10% opacidad).
- `transition: transform 0.2s` anima cualquier cambio en `transform` durante 0.2 segundos.
- `translateY(-4px)` mueve la tarjeta 4 pixeles hacia arriba (efecto de "flotar").

```css
.product-card img {
  width: 100%;
  height: 200px;
  object-fit: cover;  /* Recorta la imagen para llenar el espacio sin deformarla */
}
```

`object-fit: cover` es como `background-size: cover` pero para etiquetas `<img>`. Escala la imagen manteniendo proporcion y recorta lo que sobra.

## 3.5 Precios y badge de descuento

```css
.discount-badge {
  display: inline-block;
  background: #cc0c39;           /* Rojo llamativo */
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}

.price-offer {
  font-size: 22px;
  font-weight: 700;
  color: #e77600;                /* Naranja (color principal de la app) */
}

.price-original {
  font-size: 14px;
  color: #999;
  text-decoration: line-through; /* Tacha el precio original */
}
```

`text-decoration: line-through` dibuja una linea horizontal sobre el texto, indicando visualmente que ese precio ya no aplica.

## 3.6 Boton "Agregar al carrito" y sus estados

```css
.add-btn {
  width: 100%;
  padding: 10px;
  background: #e77600;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.add-btn:hover {
  background: #c56200;   /* Un naranja mas oscuro al pasar el mouse */
}

.add-btn:disabled {
  background: #ccc;      /* Gris cuando esta deshabilitado */
  cursor: not-allowed;   /* Cambia el cursor a un circulo con una linea */
}
```

Tres estados visuales:
1. **Normal**: naranja, cursor pointer (manita)
2. **Hover**: naranja oscuro (feedback visual de que es clickeable)
3. **Disabled**: gris con cursor "prohibido" (el producto YA esta en el carrito)

`cursor: not-allowed` es importante para UX: le dice al usuario visualmente que no puede hacer click, sin necesidad de un tooltip.

## 3.7 Items del carrito (`.cart-item`)

```css
.cart-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.cart-item-info {
  flex: 1;   /* Ocupa todo el espacio disponible entre la imagen y el precio */
}
```

`flex: 1` es shorthand de `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`. En practica: "ocupa todo el espacio sobrante". Asi la info del producto se expande y empuja el precio y el boton eliminar hacia la derecha.

## 3.8 Pantalla de autenticacion

```css
.auth-container {
  display: flex;
  justify-content: center;   /* Centra horizontalmente */
  align-items: center;        /* Centra verticalmente */
  min-height: 100vh;          /* Ocupa toda la pantalla */
  background: #f5f5f5;
}
```

`min-height: 100vh` (100% del viewport height) asegura que el contenedor ocupe toda la ventana del navegador. Combinado con `flex` + `center` + `center`, la tarjeta de login queda perfectamente centrada en ambos ejes.

```css
.auth-card input:focus {
  border-color: #e77600;      /* Borde naranja al hacer click en el input */
}
```

`:focus` se activa cuando el usuario hace click o navega con Tab al input. Cambiamos el borde a naranja para dar feedback visual de cual campo esta activo.

```css
.auth-toggle span {
  color: #e77600;
  cursor: pointer;
  font-weight: 600;
}

.auth-toggle span:hover {
  text-decoration: underline;
}
```

El texto "Registrate" / "Inicia sesion" se estiliza como un enlace (color, cursor pointer, subrayado al hover) aunque es un `<span>`, porque su funcion es de navegacion.

## 3.9 Paleta de colores

| Color     | Hex       | Uso                                        |
|-----------|-----------|--------------------------------------------|
| Naranja   | `#e77600` | Color principal: botones, precios, acentos |
| Naranja oscuro | `#c56200` | Hover de botones                     |
| Rojo      | `#cc0c39` | Badge de descuento, errores               |
| Rojo boton | `#ff4444` | Boton eliminar                            |
| Azul oscuro | `#1a1a2e` | Titulos y textos principales            |
| Gris      | `#ccc`    | Botones deshabilitados                     |
| Gris claro | `#f5f5f5` | Fondo de la aplicacion                   |

---

# PARTE 4: COMO PROBAR CON POSTMAN

## 1. Registrar usuario

```
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "email": "juan@correo.com",
  "password": "123456"
}
```

O usar el usuario por defecto:

```
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "demo@demo.com",
  "password": "123456"
}
```

Copiar el `token` de la respuesta.

## 2. Listar productos

```
GET http://localhost:3001/api/products
```

(No requiere token)

## 3. Agregar producto al carrito

```
POST http://localhost:3001/api/cart
Authorization: Bearer <tu_token_aqui>
Content-Type: application/json

{
  "idProducto": 1,
  "sku": "RCH45Q1N",
  "precio": 9.99
}
```

## 4. Ver carrito

```
GET http://localhost:3001/api/cart
Authorization: Bearer <tu_token_aqui>
```

## 5. Eliminar producto del carrito

```
DELETE http://localhost:3001/api/cart/product/1
Authorization: Bearer <tu_token_aqui>
```

---

# PARTE 5: MODELO DE DATOS

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   usuario    │       │    orden     │       │  orden_items  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id_usuario PK│◄──────│ id_usuario FK│       │ id_detalle PK│
│ nombre       │       │ id_carrito PK│◄──────│ id_carrito FK│
│ email        │       │ fecha_creac. │       │ id_producto  │
│ password     │       │ fecha_actual.│       │ sku          │
│              │       │ total_compra │       │ precio       │
└──────────────┘       └──────────────┘       └──────────────┘
```

**Relaciones:**
- Un **usuario** tiene una **orden** (carrito) → relacion 1:1
- Una **orden** tiene muchos **orden_items** → relacion 1:N

---

# PARTE 6: CALCULO DEL PRECIO ORIGINAL

```
precioOriginal = precioOferta / (1 - descuento / 100)
```

Ejemplo: producto a `$10.00` con `20%` de descuento:

```
precioOriginal = 10 / (1 - 20/100)
precioOriginal = 10 / 0.80
precioOriginal = $12.50
```

Verificacion: `$12.50 × 0.80 = $10.00` (correcto)

---

# PARTE 7: PREGUNTAS DE ENTREVISTA Y RESPUESTAS

## Sobre el Backend

### P: ¿Por que elegiste PostgreSQL y no otra base de datos?

PostgreSQL es una base de datos relacional robusta, de codigo abierto y con excelente soporte para tipos de datos como `NUMERIC` (precision exacta para precios), `TIMESTAMP` y constraints como `UNIQUE` y `FOREIGN KEY`. A diferencia de SQLite, PostgreSQL funciona como un servidor independiente, lo que permite multiples conexiones simultaneas y es lo que se usa en produccion real. MongoDB podria servir, pero al tener relaciones claras entre usuario → orden → items, una base relacional modela mejor esos datos.

### P: ¿Que es un Pool de conexiones y por que lo usas en lugar de Client?

Un `Pool` mantiene un conjunto de conexiones abiertas y las reutiliza entre peticiones. Cuando el servidor recibe una peticion, toma una conexion disponible del pool, ejecuta la query, y la devuelve al pool para que otra peticion la use. Con `Client` tendriamos una sola conexion: si se cae hay que reconectar manualmente, y si llegan 100 peticiones simultaneas, todas esperarian por esa unica conexion. El Pool resuelve ambos problemas.

### P: ¿Que es una query parametrizada y por que es importante?

Es cuando separamos la query SQL de los valores usando placeholders (`$1`, `$2`):

```js
// Parametrizada (segura):
pool.query('SELECT * FROM usuario WHERE email = $1', [email]);

// Concatenada (vulnerable):
pool.query(`SELECT * FROM usuario WHERE email = '${email}'`);
```

En la version concatenada, si alguien envia como email `' OR 1=1 --`, la query se convierte en `SELECT * FROM usuario WHERE email = '' OR 1=1 --'` y devuelve TODOS los usuarios. Esto se llama SQL Injection y es una de las vulnerabilidades mas criticas (OWASP Top 10). Con queries parametrizadas, PostgreSQL trata el valor como dato puro, nunca como codigo SQL.

### P: ¿Que es JWT y como funciona el flujo de autenticacion?

JWT (JSON Web Token) es un estandar para transmitir informacion de forma segura entre partes. El flujo es:

1. El usuario envia email y contraseña al endpoint `/api/auth/login`
2. El servidor verifica las credenciales contra la base de datos
3. Si son correctas, genera un token firmado con una clave secreta (`JWT_SECRET`) que contiene el `id` y `email` del usuario
4. El cliente guarda ese token (en nuestro caso en `localStorage`)
5. En cada peticion protegida, el cliente envia el token en el header `Authorization: Bearer <token>`
6. El middleware del servidor verifica la firma del token. Si es valida, extrae los datos del usuario y los pone en `req.user`
7. El token expira en 24 horas, despues de eso el usuario debe volver a loguearse

La ventaja de JWT es que el servidor no necesita guardar sesiones: toda la informacion esta en el token. Es "stateless".

### P: ¿Por que hasheas las contraseñas con bcrypt? ¿Que pasa si no lo haces?

Si guardamos las contraseñas en texto plano y alguien accede a la base de datos (por un hackeo, un backup expuesto, o un empleado malicioso), tiene las contraseñas reales de todos los usuarios. Con bcrypt:

- La contraseña se transforma en un hash irreversible: `"123456"` → `"$2a$10$N9qo8uLOickgx2ZMRZoMy..."`
- Aunque alguien vea el hash, no puede obtener la contraseña original
- `bcrypt.compare()` permite verificar si una contraseña coincide con un hash sin necesidad de "deshashear"
- El numero `10` en `bcrypt.hash(password, 10)` son las "rondas de sal": mas rondas = mas seguro pero mas lento. 10 es el estandar recomendado

### P: ¿Que es un middleware en Express y para que usas el tuyo?

Un middleware es una funcion que se ejecuta ENTRE que llega la peticion y que el controlador la procesa. Tiene acceso a `req`, `res` y `next()`. Si llama `next()`, la peticion continua al siguiente middleware o controlador. Si no, la peticion se detiene ahi.

Nuestro middleware de autenticacion:
1. Extrae el token del header `Authorization`
2. Verifica que sea valido con `jwt.verify()`
3. Si es valido: agrega `req.user` con los datos del usuario y llama `next()`
4. Si no es valido: responde `401 Unauthorized` y NO llama `next()`, la peticion muere ahi

Lo aplicamos con `router.use(authMiddleware)` en las rutas del carrito, asi todas las rutas debajo quedan protegidas automaticamente.

### P: ¿Que es CORS y por que lo necesitas?

CORS (Cross-Origin Resource Sharing) es una politica de seguridad del navegador. Por defecto, el navegador bloquea peticiones JavaScript a un dominio/puerto diferente al de la pagina. Nuestro frontend corre en `localhost:5173` y el backend en `localhost:3001`: son origenes distintos (diferente puerto). Sin `cors()`, el navegador bloquearia todas las peticiones del frontend al backend con un error como:

```
Access to fetch at 'http://localhost:3001/api' from origin 'http://localhost:5173' has been blocked by CORS policy
```

`app.use(cors())` agrega los headers necesarios para permitir peticiones desde cualquier origen.

### P: ¿Por que separas Models de Controllers? ¿No es mas facil poner todo junto?

Es mas facil al principio, pero genera problemas cuando el proyecto crece:

- **Mantenibilidad**: Si necesito cambiar una query SQL, se exactamente donde buscar (models). No tengo que leer logica HTTP para encontrar el SQL.
- **Reutilizacion**: Si dos controladores necesitan buscar un usuario por email, ambos llaman `userModel.findByEmail()`. Sin modelos, duplicaria la query.
- **Testing**: Puedo probar los modelos sin levantar Express, y probar los controladores sin una base de datos real (mockeando los modelos).
- **Cambio de base de datos**: Si migro de PostgreSQL a MySQL, solo cambio los modelos. Los controladores y rutas no se tocan.

### P: ¿Que pasa si dos usuarios agregan un producto al carrito al mismo tiempo?

No hay problema porque cada usuario tiene su propia orden (carrito). La tabla `orden` tiene una relacion con `id_usuario`, asi que las operaciones de un usuario no afectan al otro. PostgreSQL maneja la concurrencia internamente con su sistema de MVCC (Multi-Version Concurrency Control), donde cada transaccion ve una "foto" consistente de los datos.

### P: ¿Que pasaria si el servidor se cae? ¿Se pierden los datos del carrito?

No. Los datos estan en PostgreSQL, que es una base de datos persistente en disco. Cuando el servidor se reinicia, se reconecta al Pool y los carritos siguen ahi. El token del usuario sigue en `localStorage` del navegador, asi que ni siquiera necesita volver a loguearse (a menos que el token haya expirado).

### P: ¿Como manejas los errores en el backend?

Cada controlador tiene un `try/catch` que atrapa errores inesperados y responde con status `500`:

```js
try {
  // logica normal
} catch (err) {
  res.status(500).json({ error: 'Error al agregar producto al carrito' });
}
```

Ademas, validamos los datos al inicio del controlador antes de hacer cualquier operacion:

```js
if (!idProducto || precio === undefined) {
  return res.status(400).json({ error: 'idProducto y precio son requeridos' });
}
```

Codigos HTTP usados:
- `200` OK (operacion exitosa)
- `201` Created (recurso creado)
- `400` Bad Request (faltan datos)
- `401` Unauthorized (token invalido o ausente)
- `404` Not Found (recurso no encontrado)
- `409` Conflict (producto duplicado en carrito)
- `500` Internal Server Error (error inesperado)

### P: ¿Por que usas `dotenv` y no hardcodeas las credenciales?

Tres razones:

1. **Seguridad**: Las credenciales no se suben a Git (`.env` esta en `.gitignore`). Si el repositorio es publico, nadie ve tus contraseñas.
2. **Flexibilidad**: En desarrollo uso `localhost` con contraseña `123`, en produccion uso un servidor remoto con otra contraseña. Solo cambio el `.env`, no el codigo.
3. **Buena practica**: Es una regla de los "Twelve-Factor App" (metodologia para apps modernas): la configuracion siempre va en variables de entorno, nunca en el codigo.

---

## Sobre el Frontend

### P: ¿Por que usaste Vite en lugar de Create React App?

Create React App (CRA) esta oficialmente deprecado desde 2023. Vite es el reemplazo recomendado por la comunidad React. Las diferencias principales:

- **Velocidad**: CRA usa Webpack que compila TODO el codigo cada vez que guardas. Vite usa ESModules nativos del navegador, solo recompila el archivo que cambio. En proyectos grandes la diferencia es de segundos vs milisegundos.
- **Build**: Vite usa Rollup para el build de produccion, que genera bundles mas pequeños.
- **Configuracion**: `vite.config.js` es mucho mas simple que la configuracion de Webpack.

### P: ¿Que es `useState` y como funciona?

`useState` es un Hook de React que permite agregar estado a un componente funcional. Retorna un array con dos elementos:

```js
const [valor, setValor] = useState(valorInicial);
```

- `valor`: el estado actual
- `setValor`: funcion para actualizar el estado
- `valorInicial`: el valor con el que empieza

Cuando llamas `setValor(nuevoValor)`, React re-renderiza el componente con el nuevo valor. Es la forma de hacer que la UI reaccione a cambios de datos.

### P: ¿Que es `useEffect` y por que tiene un array de dependencias?

`useEffect` permite ejecutar codigo cuando el componente se monta, actualiza o desmonta. Es para "efectos secundarios": cosas que pasan fuera de React (fetch de datos, timers, suscripciones).

```js
useEffect(() => {
  fetchProducts();   // Se ejecuta al montar
}, []);              // [] = solo una vez
```

El array de dependencias controla CUANDO se re-ejecuta:
- `[]` vacio → solo al montar (equivalente a `componentDidMount`)
- `[token]` → al montar Y cada vez que `token` cambie
- Sin array → en CADA render (casi nunca lo quieres)

En nuestro caso:

```js
useEffect(() => {
  if (token) fetchCart();
}, [token]);
```

Esto dice: "cada vez que `token` cambie (login, logout), vuelve a cargar el carrito". Cuando el usuario hace login, `token` pasa de `null` a un string, el effect se dispara y carga el carrito del nuevo usuario.

### P: ¿Que es el renderizado condicional y como lo usas?

Es mostrar u ocultar componentes segun una condicion. En React se hace con operadores de JavaScript:

**Operador ternario** (condicion ? verdadero : falso):
```jsx
{showCart ? <Cart /> : <ProductList />}
```

**Operador AND** (condicion && componente):
```jsx
{isRegister && <input placeholder="Nombre" />}
```

Con AND, si `isRegister` es `false`, React no renderiza nada (no muestra el input). Si es `true`, renderiza el input. Es mas limpio que un ternario cuando solo necesitas mostrar/ocultar algo sin un "else".

### P: ¿Como evitas que el usuario agregue un producto dos veces al carrito?

Con doble proteccion:

**Frontend** - El boton se deshabilita con el atributo `disabled`:

```jsx
const isInCart = (id) => cartItems.some((item) => item.id_producto === id);

<button disabled={isInCart(product.id)}>
  {isInCart(product.id) ? 'En el carrito' : 'Agregar al carrito'}
</button>
```

`Array.some()` recorre el array `cartItems` y devuelve `true` si encuentra un item con el mismo `id_producto`. Cuando `disabled={true}`, el boton:
- No responde a clicks (comportamiento nativo de HTML)
- Se aplica el estilo `.add-btn:disabled` (gris, cursor prohibido)
- El texto cambia a "En el carrito"

Esto funciona en tiempo real: al agregar un producto, `fetchCart()` actualiza `cartItems`, React re-renderiza `ProductList`, y `isInCart()` ahora retorna `true` para ese producto.

**Backend** - El controlador verifica antes de insertar:

```js
const existing = await orderItemModel.findByCartAndProduct(cart.id_carrito, idProducto);
if (existing) {
  return res.status(409).json({ error: 'El producto ya está en el carrito' });
}
```

Asi, aunque alguien envie la peticion directamente con Postman o curl (saltandose el frontend), el backend rechaza el duplicado con status `409 Conflict`.

### P: ¿Que es `localStorage` y por que guardas el token ahi?

`localStorage` es un almacenamiento del navegador que persiste entre sesiones (no se borra al cerrar la pestaña). Guardamos el token ahi para que el usuario no tenga que loguearse cada vez que recarga la pagina.

Al cargar la app, verificamos si hay un token guardado:

```js
useEffect(() => {
  const savedToken = localStorage.getItem('token');
  if (savedToken) setToken(savedToken);
}, []);
```

**Alternativa**: cookies con `HttpOnly` son mas seguras contra ataques XSS, pero requieren configuracion adicional en el backend. Para este proyecto, `localStorage` es suficiente y mas simple de implementar.

### P: ¿Que es el optional chaining (`?.`) y por que lo necesitas?

Es un operador que accede a propiedades de un objeto solo si el objeto NO es `null` o `undefined`. Si lo es, devuelve `undefined` en lugar de lanzar un error.

```js
// Sin optional chaining - EXPLOTA si product es null:
product.thumbnail   // TypeError: Cannot read properties of null

// Con optional chaining - devuelve undefined si product es null:
product?.thumbnail  // undefined
```

Lo usamos en `Cart.jsx` porque `getProduct()` podria no encontrar el producto (si la API externa cambio sus datos):

```jsx
<img src={product?.thumbnail || ''} />
<h3>{product?.title || 'Producto'}</h3>
```

El `|| ''` es un fallback: si `product?.thumbnail` es `undefined`, usa un string vacio.

### P: ¿Por que usas `Number()` para el total del carrito?

PostgreSQL con tipo `NUMERIC(10,2)` devuelve los valores como strings en el driver `pg` de Node.js (para preservar la precision decimal). Por ejemplo, devuelve `"25.99"` en lugar de `25.99`.

Si intentamos hacer `"25.99".toFixed(2)`, funciona porque JavaScript lo convierte automaticamente, pero `Number()` lo hace explicito y evita sorpresas:

```js
Number(cart?.total_compra || 0).toFixed(2)
```

### P: ¿Como funciona la comunicacion entre componentes?

Usamos el patron de **props drilling** (pasar datos de padre a hijo):

```
App.jsx (estado global)
├── Auth.jsx        ← recibe onLogin()
├── ProductList.jsx ← recibe products, cartItems, onAddToCart()
└── Cart.jsx        ← recibe cart, items, products, onRemove(), onBack()
```

`App.jsx` es el unico que tiene el estado y las funciones fetch. Los hijos reciben lo que necesitan via props:
- **Datos**: `products`, `cartItems`, `cart` (para renderizar)
- **Callbacks**: `onAddToCart`, `onRemove`, `onLogin` (para que el hijo notifique al padre que algo paso)

Cuando el hijo llama `onAddToCart(product)`, en realidad esta ejecutando `addToCart` de `App.jsx`, que hace el fetch, actualiza el estado, y React re-renderiza todos los componentes afectados.

Para proyectos mas grandes, este patron se vuelve tedioso (muchos props pasando por varios niveles). En ese caso se usaria Context API o una libreria como Redux o Zustand.

### P: ¿Que es `flex: 1` y como lo usas en el carrito?

`flex: 1` es shorthand de `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`. En palabras simples: "ocupa todo el espacio disponible que sobre".

En los items del carrito:

```
[Imagen 80px] [Info del producto → flex:1] [Precio] [Boton Eliminar]
```

La imagen tiene tamaño fijo (80px), el precio y boton tambien. El `flex: 1` en `.cart-item-info` hace que la info se estire para llenar todo el espacio restante, empujando el precio y el boton hacia la derecha. Sin `flex: 1`, todos los elementos se amontonarian a la izquierda.

### P: ¿Como hace tu CSS Grid para ser responsive sin media queries?

La clave esta en esta linea:

```css
grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
```

Desglose:
- `auto-fill`: crea tantas columnas como quepan en el ancho disponible
- `minmax(260px, 1fr)`: cada columna mide minimo 260px y maximo una fraccion igual del espacio

Entonces:
- En 1200px de ancho → caben 4 columnas de 300px cada una
- En 800px → caben 3 columnas de ~266px
- En 520px → caben 2 columnas de 260px
- En 400px → solo cabe 1 columna de 400px

El navegador calcula automaticamente cuantas columnas caben. No necesitamos escribir `@media (max-width: 768px) { ... }` para cada breakpoint.

---

## Sobre conceptos generales

### P: ¿Que es una API REST?

REST (Representational State Transfer) es un estilo de arquitectura para diseñar APIs web. Las reglas principales:

1. **Usa URLs como recursos**: `/api/products`, `/api/cart` (sustantivos, no verbos)
2. **Usa metodos HTTP como acciones**: GET (obtener), POST (crear), PUT (actualizar), DELETE (eliminar)
3. **Stateless**: cada peticion lleva toda la informacion necesaria (por eso enviamos el token en cada request)
4. **Respuestas con codigos HTTP**: 200, 201, 400, 401, 404, 500

Ejemplo en nuestro proyecto:
- `GET /api/products` → obtener productos (leer)
- `POST /api/cart` → agregar al carrito (crear)
- `DELETE /api/cart/product/1` → eliminar del carrito (borrar)

### P: ¿Que diferencia hay entre autenticacion y autorizacion?

- **Autenticacion**: verificar QUIEN eres. "¿Eres quien dices ser?" → Login con email y contraseña.
- **Autorizacion**: verificar QUE puedes hacer. "¿Tienes permiso para esto?" → Solo puedes ver TU carrito, no el de otro usuario.

En nuestro proyecto:
- Autenticacion: el middleware verifica el token JWT (¿el usuario existe y el token es valido?)
- Autorizacion: el controlador usa `req.user.id` para buscar solo el carrito de ese usuario (no puede ver/modificar carritos ajenos)

### P: ¿Que es `async/await` y por que lo usas en los controladores?

`async/await` es azucar sintactico sobre Promises. Las operaciones de base de datos y fetch son asincronas (tardan un tiempo indeterminado). Sin `await`, el codigo seguiria ejecutandose sin esperar el resultado:

```js
// Sin await - result es una Promise, no el resultado:
const result = pool.query('SELECT * FROM usuario');
console.log(result);  // Promise { <pending> }

// Con await - espera a que termine y obtiene el resultado:
const result = await pool.query('SELECT * FROM usuario');
console.log(result);  // { rows: [...] }
```

`async` marca la funcion como asincrona (necesario para usar `await` dentro). `await` pausa la ejecucion de esa funcion hasta que la Promise se resuelva, sin bloquear el resto del servidor.

### P: ¿Que harias diferente si este proyecto fuera a produccion?

1. **Variables de entorno**: usar un servicio como AWS Secrets Manager en lugar de `.env`
2. **Validacion**: agregar una libreria como `Joi` o `Zod` para validar los datos de entrada de forma mas robusta
3. **Rate limiting**: limitar peticiones por IP para evitar ataques de fuerza bruta al login
4. **HTTPS**: cifrar la comunicacion con certificado SSL
5. **Logging**: agregar un sistema de logs (Winston o Pino) para monitorear errores en produccion
6. **Token refresh**: implementar refresh tokens para no forzar al usuario a re-loguearse cada 24 horas
7. **Paginacion**: los productos se cargan todos de una vez, en produccion se paginarian
8. **Tests**: agregar tests unitarios (Jest) y de integracion (Supertest)
9. **Docker**: containerizar la app y la base de datos para que cualquiera pueda levantar el proyecto con un solo comando
10. **CI/CD**: pipeline automatizado de tests y deploy

### P: ¿Por que la ruta de productos es publica pero la del carrito es protegida?

Porque los productos son informacion publica: cualquier persona puede ver el catalogo sin necesidad de registrarse (como en cualquier tienda online). Pero el carrito es informacion privada de cada usuario: necesitas estar autenticado para que el sistema sepa A QUIEN pertenece ese carrito. Si la ruta del carrito fuera publica, cualquiera podria ver o modificar el carrito de otro usuario.

### P: ¿Que es el `box-sizing: border-box` y por que lo aplicas a todos los elementos?

Por defecto, CSS usa `content-box`: el ancho que declaras solo aplica al contenido, y el padding + border se suman encima:

```
content-box: width: 200px + padding: 20px + border: 2px = 244px totales
border-box:  width: 200px (ya incluye padding y border) = 200px totales
```

Con `border-box`, si dices `width: 200px`, el elemento SIEMPRE mide 200px sin importar el padding o border que le pongas. Esto hace que el diseño sea mucho mas predecible y facil de calcular. Se aplica a `*` (todos los elementos) porque quieres que TODO el layout funcione asi.
