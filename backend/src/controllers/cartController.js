const cartService = require('../services/cartService');

const addToCart = async (req, res) => {
  const idUsuario = req.user.id;
  const { idProducto, sku, precio } = req.body;

  if (!idProducto || precio === undefined) {
    return res.status(400).json({ error: 'idProducto y precio son requeridos' });
  }

  try {
    const result = await cartService.addProductToCart(idUsuario, idProducto, sku, precio);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Error al agregar producto al carrito';
    res.status(status).json({ error: message });
  }
};

const getCart = async (req, res) => {
  const idUsuario = req.user.id;

  try {
    const result = await cartService.getUserCart(idUsuario);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
};

const removeFromCart = async (req, res) => {
  const idUsuario = req.user.id;
  const { idProducto } = req.params;

  try {
    const result = await cartService.removeProductFromCart(idUsuario, idProducto);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Error al eliminar producto del carrito';
    res.status(status).json({ error: message });
  }
};

module.exports = { addToCart, getCart, removeFromCart };
