/**
 * Rotas da API REST do Insul V4
 * Padrão: ES Modules (ESM)
 */

import { Router } from 'express';
import { handleCalculateBolus } from '../controllers/bolusController.js';
import { handleSearchFoods } from '../controllers/foodController.js';

const router = Router();

// Endpoint de Cálculo de Bolus
router.post('/bolus/calculate', handleCalculateBolus);

// Endpoint de Busca de Alimentos
router.get('/foods/search', handleSearchFoods);

export default router;
