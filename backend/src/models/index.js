const sequelize = require('../db/sequelize');
const User = require('./User');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const bcrypt = require('bcryptjs');

// Relaciones
User.hasMany(Order, { foreignKey: 'id_usuario', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'id_usuario', as: 'user' });

Order.hasMany(OrderItem, { foreignKey: 'id_carrito', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'id_carrito', as: 'order' });

const initDB = async () => {
  await sequelize.sync();

  // Seed: crear usuario por defecto si no existe
  const userCount = await User.count();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await User.create({
      nombre: 'Usuario Demo',
      email: 'demo@demo.com',
      password: hashedPassword
    });
    console.log('Usuario por defecto creado: demo@demo.com / 123456');
  }
};

module.exports = {
  sequelize,
  User,
  Order,
  OrderItem,
  initDB
};
