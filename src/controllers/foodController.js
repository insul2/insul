/**
 * Controller REST para Busca no Banco Nutricional de Alimentos
 * Endpoint: GET /api/v1/foods/search?q=...
 * Padrão: ES Modules (ESM)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregamento lazy/cache dos alimentos
let foodsDatabase = null;

function loadFoods() {
  if (foodsDatabase) return foodsDatabase;
  try {
    const jsonPath = path.join(__dirname, '../../data/tbca_scraped_foods.json');
    if (fs.existsSync(jsonPath)) {
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      foodsDatabase = JSON.parse(rawData);
      console.log(`🍏 [FoodController] Base de dados carregada (${foodsDatabase.length} alimentos).`);
    } else {
      console.warn('⚠️ [FoodController] Arquivo tbca_scraped_foods.json não encontrado.');
      foodsDatabase = [];
    }
  } catch (err) {
    console.error('❌ Error ao carregar base de alimentos:', err);
    foodsDatabase = [];
  }
  return foodsDatabase;
}

export function handleSearchFoods(req, res) {
  try {
    const query = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    if (!query || query.length < 2) {
      return res.status(200).json({
        status: 'success',
        resultsCount: 0,
        data: []
      });
    }

    const foods = loadFoods();
    const matches = foods
      .filter(item => item.name && item.name.toLowerCase().includes(query))
      .slice(0, limit);

    return res.status(200).json({
      status: 'success',
      query,
      resultsCount: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('❌ Erro na busca de alimentos:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao realizar busca de alimentos.',
      error: error.message
    });
  }
}
