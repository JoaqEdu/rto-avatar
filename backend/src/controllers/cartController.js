const orderModel = require('../models/orderModel');
const orderItemModel = require('../models/orderItemModel');

const addToCart = async (req, res) => {
  const idUsuario = req.user.id;
  const { idProducto, sku, precio } = req.body;

  if (!idProducto || precio === undefined) {
    return res.status(400).json({ error: 'idProducto y precio son requeridos' });
  }

  try {
    let cart = await orderModel.findByUserId(idUsuario);

    if (!cart) {
      cart = await orderModel.create(idUsuario);
    }

    const existing = await orderItemModel.findByCartAndProduct(cart.id_carrito, idProducto);
    if (existing) {
      return res.status(409).json({ error: 'El producto ya está en el carrito' });
    }

    await orderItemModel.create(cart.id_carrito, idProducto, sku || null, precio);

    const updatedCart = await orderModel.updateTotal(cart.id_carrito);
    const items = await orderItemModel.findByCartId(cart.id_carrito);

    res.status(201).json({ cart: updatedCart, items });
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar producto al carrito' });
  }
};

const getCart = async (req, res) => {
  const idUsuario = req.user.id;

  try {
    const cart = await orderModel.findByUserId(idUsuario);

    if (!cart) {
      return res.json({ cart: null, items: [] });
    }

    const items = await orderItemModel.findByCartId(cart.id_carrito);
    res.json({ cart, items });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
};

const removeFromCart = async (req, res) => {
  const idUsuario = req.user.id;
  const { idProducto } = req.params;

  try {
    const cart = await orderModel.findByUserId(idUsuario);
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }

    const item = await orderItemModel.findByCartAndProduct(cart.id_carrito, idProducto);
    if (!item) {
      return res.status(404).json({ error: 'Producto no encontrado en el carrito' });
    }

    await orderItemModel.removeByCartAndProduct(cart.id_carrito, idProducto);

    const updatedCart = await orderModel.updateTotal(cart.id_carrito);
    const items = await orderItemModel.findByCartId(cart.id_carrito);

    res.json({ cart: updatedCart, items });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto del carrito' });
  }
};

module.exports = { addToCart, getCart, removeFromCart };
