const { Router } = require('express');
const { addToCart, getCart, removeFromCart } = require('../controllers/cartController');
const { authMiddleware } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

router.post('/', addToCart);
router.get('/', getCart);
router.delete('/product/:idProducto', removeFromCart);

module.exports = router;
