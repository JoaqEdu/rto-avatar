const { pool } = require('../db/database');

const findByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const create = async (nombre, email, hashedPassword) => {
  const result = await pool.query(
    'INSERT INTO usuario (nombre, email, password) VALUES ($1, $2, $3) RETURNING id_usuario, nombre, email',
    [nombre, email, hashedPassword]
  );
  return result.rows[0];
};

module.exports = { findByEmail, create };
