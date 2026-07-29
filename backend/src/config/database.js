/**
 * Conexão Nativa com PostgreSQL usando pg.Pool (Sem ORM / Alta Performance + Failover Silencioso)
 */

import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 1500,
});

pool.on('error', (err) => {
  if (config.nodeEnv === 'development' && err.code === 'ECONNREFUSED') {
    // Modo offline local — fallback automático ativo
    return;
  }
  console.error('❌ Erro inesperado no Pool do PostgreSQL:', err.message);
});

/**
 * Função helper para executar queries SQL diretas
 * @param {string} text Consulta SQL
 * @param {Array} params Parâmetros prepared statement
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
      console.log(`⏱️ SQL Query executada em ${duration}ms: ${text.substring(0, 80)}...`);
    }
    return res;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      // Retorna null silenciosamente para ativar o fallback JSON local sem poluir o console de erro do servidor
      return null;
    }
    console.error('❌ Erro na execução da SQL Query:', error.message);
    throw error;
  }
}
