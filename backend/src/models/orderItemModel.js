const { pool } = require('../db/database');

const findByCartId = async (idCarrito) => {
  const result = await pool.query('SELECT * FROM orden_items WHERE id_carrito = $1', [idCarrito]);
  return result.rows;
};

const findByCartAndProduct = async (idCarrito, idProducto) => {
  const result = await pool.query(
    'SELECT * FROM orden_items WHERE id_carrito = $1 AND id_producto = $2',
    [idCarrito, idProducto]
  );
  return result.rows[0] || null;
};

const create = async (idCarrito, idProducto, sku, precio) => {
  const result = await pool.query(
    'INSERT INTO orden_items (id_carrito, id_producto, sku, precio) VALUES ($1, $2, $3, $4) RETURNING *',
    [idCarrito, idProducto, sku, precio]
  );
  return result.rows[0];
};

const removeByCartAndProduct = async (idCarrito, idProducto) => {
  await pool.query(
    'DELETE FROM orden_items WHERE id_carrito = $1 AND id_producto = $2',
    [idCarrito, idProducto]
  );
};

module.exports = { findByCartId, findByCartAndProduct, create, removeByCartAndProduct };
