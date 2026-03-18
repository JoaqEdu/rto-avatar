const getProducts = async (req, res) => {
  try {
    const response = await fetch('https://dummyjson.com/products?limit=0');
    const data = await response.json();

    const products = data.products.map((p) => {
      const price = p.price;
      const discountPercentage = p.discountPercentage;
      // price is the offer price (after discount)
      // originalPrice = price / (1 - discountPercentage/100)
      const originalPrice = +(price / (1 - discountPercentage / 100)).toFixed(2);

      return {
        id: p.id,
        thumbnail: p.thumbnail,
        brand: p.brand || 'Sin marca',
        title: p.title,
        price,
        discountPercentage,
        originalPrice,
        sku: p.sku || `SKU-${p.id}`,
      };
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

module.exports = { getProducts };
