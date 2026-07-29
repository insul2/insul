/**
 * Controller para Histórico e Leituras de Glicemia — LEBEN Engine V4.0
 * Padrão: ES Modules (ESM) — Tendências com Nomes em Português & Setas (Isolamento por Usuário)
 */

import { query } from '../config/database.js';

// Repositório em memória por usuário (tenantId)
const userReadingsMap = new Map();

// Apenas a conta de demonstração possui leituras de teste
userReadingsMap.set('usr_demo_1001', [
  { id: '1', glucoseMgDl: 118, trend: '➡️ Estável', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', glucoseMgDl: 145, trend: '↗️ Subindo', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', glucoseMgDl: 95, trend: '➡️ Estável', timestamp: new Date(Date.now() - 10800000).toISOString() }
]);

export async function getGlucoseReadingsHandler(req, res) {
  try {
    const userId = req.user ? req.user.id : 'anonymous';

    // 1. Buscar no PostgreSQL se disponível
    try {
      const dbRes = await query(
        'SELECT id, glucose_mg_dl as "glucoseMgDl", trend, created_at as timestamp FROM glucose_readings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      if (dbRes && dbRes.rows) {
        return res.status(200).json({
          status: 'success',
          data: dbRes.rows
        });
      }
    } catch (dbErr) {
      // Fallback para cache isolado por usuário
    }

    const readings = userReadingsMap.get(userId) || [];
    return res.status(200).json({
      status: 'success',
      data: readings
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar histórico de glicemia.'
    });
  }
}

export async function logGlucoseReadingHandler(req, res) {
  try {
    const userId = req.user ? req.user.id : 'anonymous';
    const { glucoseMgDl, trend } = req.body || {};

    if (!glucoseMgDl) {
      return res.status(400).json({ status: 'error', message: 'Valor de glicemia é obrigatório.' });
    }

    const newReading = {
      id: String(Date.now()),
      glucoseMgDl: Number(glucoseMgDl),
      trend: trend || '➡️ Estável',
      timestamp: new Date().toISOString()
    };

    // 1. Tentar salvar no PostgreSQL se disponível
    try {
      await query(
        'INSERT INTO glucose_readings (id, user_id, glucose_mg_dl, trend, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [newReading.id, userId, newReading.glucoseMgDl, newReading.trend]
      );
    } catch (dbErr) {
      // Fallback em memória
    }

    const userReadings = userReadingsMap.get(userId) || [];
    userReadings.unshift(newReading);
    userReadingsMap.set(userId, userReadings);

    return res.status(201).json({
      status: 'success',
      data: newReading
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao registrar leitura de glicemia.'
    });
  }
}
