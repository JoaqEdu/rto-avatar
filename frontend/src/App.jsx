import { useState, useEffect } from 'react';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import Auth from './components/Auth';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setCart(null);
    setCartItems([]);
    setShowCart(false);
  };

  const fetchProducts = async () => {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  };

  const fetchCart = async () => {
    if (!token) return;
    const res = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    const data = await res.json();
    setCart(data.cart);
    setCartItems(data.items || []);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (token) fetchCart();
  }, [token]);

  const addToCart = async (product) => {
    const res = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        idProducto: product.id,
        sku: product.sku,
        precio: product.price,
      }),
    });

    if (res.ok) {
      await fetchCart();
    } else if (res.status === 401) {
      handleLogout();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const removeFromCart = async (idProducto) => {
    const res = await fetch(`${API_URL}/cart/product/${idProducto}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      await fetchCart();
    } else if (res.status === 401) {
      handleLogout();
    }
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Tienda de Productos</h1>
        <div className="header-actions">
          <span className="user-name">Hola, {user.nombre}</span>
          <button className="cart-btn" onClick={() => setShowCart(!showCart)}>
            Carrito ({cartItems.length})
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {showCart ? (
        <Cart
          cart={cart}
          items={cartItems}
          products={products}
          onRemove={removeFromCart}
          onBack={() => setShowCart(false)}
        />
      ) : loading ? (
        <p className="loading">Cargando productos...</p>
      ) : (
        <ProductList
          products={products}
          cartItems={cartItems}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}

export default App;
