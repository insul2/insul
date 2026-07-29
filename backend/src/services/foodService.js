/**
 * Serviço de Busca de Alimentos Nutricionais (PostgreSQL Nativo + Base Verificada TACO/UNICAMP)
 * Suporta busca por SQL indexada e ordenação inteligente por relevância e carboidratos.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let foodCache = null;

export class FoodService {
  /**
   * Carrega a base local de alimentos verificados (TACO / UNICAMP + TBCA)
   */
  static loadBackupFoods() {
    try {
      const dataPath = path.join(__dirname, '../../../data/tbca_scraped_foods.json');
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf8');
        foodCache = JSON.parse(raw);
      } else {
        foodCache = [];
      }
    } catch (err) {
      console.error('❌ Erro ao carregar backup local de alimentos:', err);
      foodCache = [];
    }
    return foodCache;
  }

  /**
   * Busca alimentos priorizando itens com carboidratos válidos (> 0)
   */
  static async searchFoods(searchTerm, limit = 20) {
    const q = String(searchTerm || '').trim();
    if (!q || q.length < 2) return [];

    // 1. Tentar busca indexada no PostgreSQL se o banco estiver conectado
    try {
      const sql = `
        SELECT code, name, brand, "group", portion_description, carbs_g, source 
        FROM food_database 
        WHERE name ILIKE $1 OR brand ILIKE $1
        ORDER BY (carbs_g > 0) DESC, name ASC
        LIMIT $2;
      `;
      const res = await query(sql, [`%${q}%`, limit]);
      if (res && res.rows && res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      // Fallback local em memória
    }

    // 2. Fallback local com a base de 8.053 alimentos verificados TACO/SBD
    const foods = this.loadBackupFoods();
    const queryLower = q.toLowerCase();

    const matches = foods.filter(item => item.name && item.name.toLowerCase().includes(queryLower));

    // Ordenar para colocar alimentos com carboidratos > 0 e nomes mais curtos/relevantes no topo
    matches.sort((a, b) => {
      if ((b.carbs_g > 0) !== (a.carbs_g > 0)) {
        return (b.carbs_g > 0) ? 1 : -1;
      }
      return a.name.length - b.name.length;
    });

    return matches.slice(0, limit);
  }
}
