import { Router } from 'express';
import { calculateBolusHandler } from '../controllers/bolusController.js';
import { searchFoodsHandler } from '../controllers/foodController.js';
import { getGlucoseReadingsHandler, logGlucoseReadingHandler } from '../controllers/glucoseController.js';
import { loginHandler, registerHandler, refreshTokenHandler } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Endpoints Públicos (Autenticação, Cadastro & Renovação Silenciosa de Token)
router.post('/auth/login', loginHandler);
router.post('/auth/register', registerHandler);
router.post('/auth/refresh', refreshTokenHandler);

// Endpoints Protegidos por JWT Bearer Middleware
router.post('/bolus/calculate', authMiddleware, calculateBolusHandler);
router.get('/foods/search', authMiddleware, searchFoodsHandler);
router.get('/glucose', authMiddleware, getGlucoseReadingsHandler);
router.post('/glucose', authMiddleware, logGlucoseReadingHandler);

export default router;
