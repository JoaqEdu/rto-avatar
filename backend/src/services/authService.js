const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');

const registerUser = async (nombre, email, password) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw { status: 409, message: 'El email ya está registrado' };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ nombre, email, password: hashedPassword });

  const token = jwt.sign(
    { id: user.id_usuario, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    user: { id: user.id_usuario, nombre: user.nombre, email: user.email },
    token
  };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const token = jwt.sign(
    { id: user.id_usuario, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    user: { id: user.id_usuario, nombre: user.nombre, email: user.email },
    token
  };
};

module.exports = { registerUser, loginUser };
