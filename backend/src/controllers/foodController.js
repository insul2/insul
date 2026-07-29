import { FoodService } from '../services/foodService.js';

export async function searchFoodsHandler(req, res) {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;

    const results = await FoodService.searchFoods(query, limit);

    return res.status(200).json({
      status: 'success',
      query,
      resultsCount: results.length,
      data: results
    });
  } catch (error) {
    console.error('❌ Controller Food Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar alimentos.',
      error: error.message
    });
  }
}
