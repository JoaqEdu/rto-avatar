# Reto Tecnico - Frontend

Interfaz de tienda de productos con carrito de compras. Construida con React y Vite.

## Requisitos previos

- Node.js (v18 o superior)
- Backend del proyecto corriendo (por defecto en http://localhost:3001)

## Instalacion

1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd frontend
```

2. Instalar dependencias

```bash
npm install
```

3. Configurar variables de entorno

Crear un archivo `.env` en la raiz del proyecto:

```env
VITE_API_URL=http://localhost:3001/api
```

4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en http://localhost:5173

## Estructura del proyecto

```
src/
├── components/
│   ├── Auth.jsx          # Pantalla de login y registro
│   ├── ProductList.jsx   # Grilla de productos
│   └── Cart.jsx          # Vista del carrito
├── App.jsx               # Componente principal
├── App.css               # Estilos
├── main.jsx              # Entry point
└── index.css             # Estilos globales
```

## Funcionalidades

- **Registro e inicio de sesion** - Autenticacion con JWT
- **Listado de productos** - Imagen, marca, nombre, precio oferta, descuento y precio original
- **Carrito de compras** - Agregar y eliminar productos, visualizar total
- **Sesion persistente** - El token se guarda en localStorage

## Usuario por defecto

El backend crea un usuario de prueba al iniciar:

- **Email:** demo@demo.com
- **Password:** 123456

## Scripts disponibles

| Comando          | Descripcion             |
|------------------|-------------------------|
| `npm run dev`    | Servidor de desarrollo  |
| `npm run build`  | Build de produccion     |
| `npm run preview`| Preview del build       |
| `npm run lint`   | Ejecutar ESLint         |

## Tecnologias

- React 19
- Vite 5
- JavaScript (ES Modules)
