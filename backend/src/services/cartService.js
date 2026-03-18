const { Order, OrderItem } = require('../models');
const { fn, col } = require('sequelize');

const getOrCreateCart = async (idUsuario) => {
  let cart = await Order.findOne({ where: { id_usuario: idUsuario } });
  if (!cart) {
    cart = await Order.create({ id_usuario: idUsuario, total_compra: 0 });
  }
  return cart;
};

const updateCartTotal = async (idCarrito) => {
  const result = await OrderItem.findOne({
    where: { id_carrito: idCarrito },
    attributes: [[fn('COALESCE', fn('SUM', col('precio')), 0), 'total']]
  });

  const total = result?.dataValues?.total || 0;

  await Order.update(
    { total_compra: total, fecha_actualizacion: new Date() },
    { where: { id_carrito: idCarrito } }
  );

  return Order.findByPk(idCarrito);
};

const addProductToCart = async (idUsuario, idProducto, sku, precio) => {
  const cart = await getOrCreateCart(idUsuario);

  const existing = await OrderItem.findOne({
    where: { id_carrito: cart.id_carrito, id_producto: idProducto }
  });

  if (existing) {
    throw { status: 409, message: 'El producto ya está en el carrito' };
  }

  await OrderItem.create({
    id_carrito: cart.id_carrito,
    id_producto: idProducto,
    sku: sku || null,
    precio
  });

  const updatedCart = await updateCartTotal(cart.id_carrito);
  const items = await OrderItem.findAll({ where: { id_carrito: cart.id_carrito } });

  return { cart: updatedCart, items };
};

const getUserCart = async (idUsuario) => {
  const cart = await Order.findOne({ where: { id_usuario: idUsuario } });

  if (!cart) {
    return { cart: null, items: [] };
  }

  const items = await OrderItem.findAll({ where: { id_carrito: cart.id_carrito } });
  return { cart, items };
};

const removeProductFromCart = async (idUsuario, idProducto) => {
  const cart = await Order.findOne({ where: { id_usuario: idUsuario } });
  if (!cart) {
    throw { status: 404, message: 'Carrito no encontrado' };
  }

  const item = await OrderItem.findOne({
    where: { id_carrito: cart.id_carrito, id_producto: idProducto }
  });

  if (!item) {
    throw { status: 404, message: 'Producto no encontrado en el carrito' };
  }

  await OrderItem.destroy({
    where: { id_carrito: cart.id_carrito, id_producto: idProducto }
  });

  const updatedCart = await updateCartTotal(cart.id_carrito);
  const items = await OrderItem.findAll({ where: { id_carrito: cart.id_carrito } });

  return { cart: updatedCart, items };
};

module.exports = { addProductToCart, getUserCart, removeProductFromCart };
