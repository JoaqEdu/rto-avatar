const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'reto-base',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuario (
      id_usuario SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orden (
      id_carrito SERIAL PRIMARY KEY,
      id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario),
      fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
      fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
      total_compra NUMERIC(10,2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orden_items (
      id_detalle SERIAL PRIMARY KEY,
      id_carrito INTEGER NOT NULL REFERENCES orden(id_carrito),
      id_producto INTEGER NOT NULL,
      sku TEXT,
      precio NUMERIC(10,2) NOT NULL
    );
  `);

  // Seed: crear usuario por defecto si no existe
  const userCount = await pool.query('SELECT COUNT(*) as count FROM usuario');
  if (parseInt(userCount.rows[0].count) === 0) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await pool.query(
      'INSERT INTO usuario (nombre, email, password) VALUES ($1, $2, $3)',
      ['Usuario Demo', 'demo@demo.com', hashedPassword]
    );
    console.log('Usuario por defecto creado: demo@demo.com / 123456');
  }
};

module.exports = { pool, initDB };
