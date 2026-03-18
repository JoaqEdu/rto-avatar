function ProductList({ products, cartItems, onAddToCart }) {
  const isInCart = (id) => cartItems.some((item) => item.id_producto === id);

  return (
    <div className="product-grid">
      {products.map((product) => (
        <div key={product.id} className="product-card">
          <img src={product.thumbnail} alt={product.title} />
          <div className="product-info">
            <span className="product-brand">{product.brand}</span>
            <h3 className="product-title">{product.title}</h3>
            <div className="product-prices">
              <span className="discount-badge">-{product.discountPercentage}%</span>
              <span className="price-offer">$ {product.price.toFixed(2)}</span>
              <span className="price-original">$ {product.originalPrice.toFixed(2)}</span>
            </div>
            <button
              className="add-btn"
              onClick={() => onAddToCart(product)}
              disabled={isInCart(product.id)}
            >
              {isInCart(product.id) ? 'En el carrito' : 'Agregar al carrito'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductList;
