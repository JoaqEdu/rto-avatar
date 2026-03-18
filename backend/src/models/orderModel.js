const { pool } = require('../db/database');

const findByUserId = async (idUsuario) => {
  const result = await pool.query('SELECT * FROM orden WHERE id_usuario = $1', [idUsuario]);
  return result.rows[0] || null;
};

const findById = async (idCarrito) => {
  const result = await pool.query('SELECT * FROM orden WHERE id_carrito = $1', [idCarrito]);
  return result.rows[0] || null;
};

const create = async (idUsuario) => {
  const result = await pool.query(
    'INSERT INTO orden (id_usuario, total_compra) VALUES ($1, 0) RETURNING *',
    [idUsuario]
  );
  return result.rows[0];
};

const updateTotal = async (idCarrito) => {
  const totalResult = await pool.query(
    'SELECT COALESCE(SUM(precio), 0) as total FROM orden_items WHERE id_carrito = $1',
    [idCarrito]
  );

  await pool.query(
    'UPDATE orden SET total_compra = $1, fecha_actualizacion = NOW() WHERE id_carrito = $2',
    [totalResult.rows[0].total, idCarrito]
  );

  return findById(idCarrito);
};

module.exports = { findByUserId, findById, create, updateTotal };
