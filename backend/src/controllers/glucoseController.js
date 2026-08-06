/**
 * Controller para Histórico e Leituras de Glicemia — LEBEN Engine V4.0
 * Padrão: ES Modules (ESM) — Tendências com Nomes em Português & Setas (Isolamento por Usuário)
 */

import mongoose from 'mongoose';
import { query } from '../config/database.js';
import { config } from '../config/env.js';

/**
 * Sanitiza e valida o userId para prevenir NoSQL Injection (RT-06).
 * Aceita apenas strings alfanuméricas, hifens e underscores (ex: 'usr_123', ObjectId hex).
 * Rejeita objetos como { "$ne": null } que explorariam o MongoDB.
 */
function sanitizeUserId(rawId) {
  if (!rawId || typeof rawId !== 'string') return null;
  // Aceita: usr_xxx, ObjectId hex (24 chars), UUIDs
  if (/^[a-zA-Z0-9_\-]{3,64}$/.test(rawId)) return rawId;
  return null;
}

// Repositório em memória por usuário (tenantId)
const userReadingsMap = new Map();

// Cache de idempotença para POST /glucose (IDEM-01)
// Estrutura: Map<idempotencyKey, { readingId, expiresAt }>
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

const glucoseReadingSchema = new mongoose.Schema({
  patient_id: mongoose.Schema.Types.Mixed,
  glucose_mgdl: Number,
  read_at: Date,
  trend: String,
  record_type: String
});

function getGlucoseReadingModel() {
  return mongoose.models.GlucoseReading || mongoose.model('GlucoseReading', glucoseReadingSchema);
}

export async function getGlucoseReadingsHandler(req, res) {
  try {
    // RT-07: Rejeitar requisições não autenticadas. Fallback 'anonymous' vazava dados entre pacientes.
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'error', message: 'Autenticação requerida.' });
    }

    // RT-06: Sanitizar userId contra NoSQL Injection
    const userId = sanitizeUserId(req.user.id);
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'Identificador de usuário inválido.' });
    }

    let readings = [];

    // 1. Tentar buscar no MongoDB Atlas / Mongoose (apenas se conectado)
    try {
      if (mongoose.connection.readyState === 1) {
        const GlucoseReadingMongo = getGlucoseReadingModel();
        let queryFilter = { patient_id: userId };
        if (mongoose.Types.ObjectId.isValid(userId)) {
          queryFilter = { $or: [{ patient_id: new mongoose.Types.ObjectId(userId) }, { patient_id: userId }] };
        }
        const docs = await GlucoseReadingMongo.find(queryFilter).sort({ read_at: -1 }).limit(100);
        if (docs && docs.length > 0) {
          readings = docs.map(d => ({
            id: d._id.toString(),
            glucoseMgDl: d.glucose_mgdl,
            trend: d.trend || '➡️ Estável',
            timestamp: d.read_at.toISOString()
          }));
          return res.status(200).json({ status: 'success', data: readings });
        }
      }
    } catch (mongoErr) {}

    // 2. Buscar no PostgreSQL se disponível
    try {
      const dbRes = await query(
        'SELECT id, glucose_mg_dl as "glucoseMgDl", trend, created_at as timestamp FROM glucose_readings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        return res.status(200).json({
          status: 'success',
          data: dbRes.rows
        });
      }
    } catch (dbErr) {
      // Fallback para cache isolado por usuário
    }

    readings = userReadingsMap.get(userId) || [];
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
    // RT-07: Rejeitar requisições não autenticadas
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: 'error', message: 'Autenticação requerida.' });
    }

    // RT-06: Sanitizar userId
    const userId = sanitizeUserId(req.user.id);
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'Identificador de usuário inválido.' });
    }

    const { glucoseMgDl, trend, timestamp } = req.body || {};

    if (!glucoseMgDl) {
      return res.status(400).json({ status: 'error', message: 'Valor de glicemia é obrigatório.' });
    }

    // IDEM-01: Idempotência via X-Idempotency-Key
    // Se o cliente enviar a mesma chave, retornamos o resultado original sem duplicar.
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (idempotencyKey) {
      const cacheKey = `${userId}:${idempotencyKey}`;
      const cached = idempotencyCache.get(cacheKey);
      if (cached) {
        if (Date.now() < cached.expiresAt) {
          return res.status(200).json({ status: 'success', data: cached.reading, idempotent: true });
        }
        idempotencyCache.delete(cacheKey);
      }
    }

    const readingDate = timestamp ? new Date(timestamp) : new Date();

    const newReading = {
      id: String(Date.now() + Math.random()),
      glucoseMgDl: Number(glucoseMgDl),
      trend: trend || '➡️ Estável',
      timestamp: readingDate.toISOString()
    };

    // 1. Salvar no MongoDB Atlas (apenas se conectado)
    try {
      if (mongoose.connection.readyState === 1) {
        const GlucoseReadingMongo = getGlucoseReadingModel();
        const patientIdVal = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        await GlucoseReadingMongo.create({
          patient_id: patientIdVal,
          glucose_mgdl: newReading.glucoseMgDl,
          read_at: readingDate,
          trend: newReading.trend,
          record_type: trend === '📊 Histórico Sensor' ? 'AUTOMATIC_CGM' : 'MANUAL_ENTRY',
          source: 'Web App NFC'
        });
      }
    } catch (mongoErr) {}

    // 2. Tentar salvar no PostgreSQL se disponível
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

    // IDEM-01: Armazenar resultado no cache de idempotência
    if (idempotencyKey) {
      const cacheKey = `${userId}:${idempotencyKey}`;
      idempotencyCache.set(cacheKey, {
        reading: newReading,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
      });
    }

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
