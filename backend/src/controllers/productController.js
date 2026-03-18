const productService = require('../services/productService');

const getProducts = async (req, res) => {
  try {
    const products = await productService.fetchProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

module.exports = { getProducts };
