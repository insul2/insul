/**
 * Controller para Histórico e Leituras de Glicemia — LEBEN Engine V4.0
 * Padrão: ES Modules (ESM) — Tendências com Nomes em Português & Setas (Isolamento por Usuário)
 */

import mongoose from 'mongoose';
import { query } from '../config/database.js';
import { config } from '../config/env.js';

// Repositório em memória por usuário (tenantId)
const userReadingsMap = new Map();

export async function getGlucoseReadingsHandler(req, res) {
  try {
    const userId = req.user ? req.user.id : 'anonymous';
    let readings = [];

    // 1. Tentar buscar no MongoDB Atlas / Mongoose
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      }
      const GlucoseReadingMongo = mongoose.models.GlucoseReading || mongoose.model('GlucoseReading', new mongoose.Schema({
        patient_id: mongoose.Schema.Types.ObjectId,
        glucose_mgdl: Number,
        read_at: Date,
        trend: String,
        record_type: String
      }));

      const docs = await GlucoseReadingMongo.find({ patient_id: userId }).sort({ read_at: -1 }).limit(100);
      if (docs && docs.length > 0) {
        readings = docs.map(d => ({
          id: d._id.toString(),
          glucoseMgDl: d.glucose_mgdl,
          trend: d.trend || '➡️ Estável',
          timestamp: d.read_at.toISOString()
        }));

        return res.status(200).json({
          status: 'success',
          data: readings
        });
      }
    } catch (mongoErr) {
      console.error('⚠️ Mongoose Glucose Read Error:', mongoErr.message);
    }

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

    // 1. Salvar no MongoDB Atlas
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      }
      const GlucoseReadingMongo = mongoose.models.GlucoseReading || mongoose.model('GlucoseReading');
      if (mongoose.Types.ObjectId.isValid(userId)) {
        await GlucoseReadingMongo.create({
          patient_id: userId,
          glucose_mgdl: newReading.glucoseMgDl,
          read_at: new Date(),
          trend: newReading.trend,
          record_type: 'MANUAL_ENTRY',
          source: 'Web App'
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
