const { DataTypes } = require('sequelize');
const sequelize = require('../db/sequelize');

const OrderItem = sequelize.define('OrdenItem', {
  id_detalle: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_carrito: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: true
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'orden_items',
  timestamps: false
});

module.exports = OrderItem;
