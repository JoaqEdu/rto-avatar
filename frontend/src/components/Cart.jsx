function Cart({ cart, items, products, onRemove, onBack }) {
  const getProduct = (idProducto) =>
    products.find((p) => p.id === idProducto);

  return (
    <div className="cart-container">
      <button className="back-btn" onClick={onBack}>
        &larr; Volver a productos
      </button>
      <h2>Mi Carrito</h2>

      {items.length === 0 ? (
        <p className="cart-empty">Tu carrito esta vacio</p>
      ) : (
        <>
          {items.map((item) => {
            const product = getProduct(item.id_producto);
            return (
              <div key={item.id_detalle} className="cart-item">
                <img
                  src={product?.thumbnail || ''}
                  alt={product?.title || 'Producto'}
                />
                <div className="cart-item-info">
                  <h3>{product?.title || 'Producto'}</h3>
                  <span className="sku">SKU: {item.sku || 'N/A'}</span>
                </div>
                <span className="cart-item-price">
                  $ {Number(item.precio).toFixed(2)}
                </span>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(item.id_producto)}
                >
                  Eliminar
                </button>
              </div>
            );
          })}
          <div className="cart-total">
            Total: $ {Number(cart?.total_compra || 0).toFixed(2)}
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;
