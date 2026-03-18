const authService = require('../services/authService');

const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
  }

  try {
    const result = await authService.registerUser(nombre, email, password);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Error al registrar usuario';
    res.status(status).json({ error: message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Error al iniciar sesión';
    res.status(status).json({ error: message });
  }
};

module.exports = { register, login };
