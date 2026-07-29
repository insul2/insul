/**
 * 🌿 Núcleo Matemático do Bolus de Insulina — LEBEN Clinical Engine V4.0
 * Padrão: ES Modules (ESM)
 */

import crypto from 'crypto';
import { validateBolusInput, SAFETY_LIMITS } from '../validation/safety.js';

export const EXERCISE_MODIFIERS = {
  NONE: { key: 'NONE', label: 'Repouso / Sem Exercício', discountFactor: 0.0 },
  WALK_30: { key: 'WALK_30', label: 'Caminhada Leve (30 min)', discountFactor: 0.15 },
  RUN_30: { key: 'RUN_30', label: 'Exercício Moderado / Corrida (30 min)', discountFactor: 0.30 },
  INTENSE_60: { key: 'INTENSE_60', label: 'Treino Intenso (60 min)', discountFactor: 0.40 }
};

export function calculateBolus(params) {
  const validation = validateBolusInput(params);

  if (!validation.isValid) {
    return {
      success: false,
      recommendedDose: 0,
      validation,
      breakdown: null,
      timestamp: new Date().toISOString()
    };
  }

  const bg = Number(params.glucose);
  const carbs = Number(params.carbs || 0);
  const iob = Number(params.iob || 0);
  const icr = Number(params.icr);
  const isf = Number(params.isf);
  
  // Garantia de Alvo Seguro (mínimo 70 mg/dL para evitar hipoglicemia iatrogênica)
  const targetInput = Number(params.target || params.targetGlucose || 100);
  const target = Math.max(70, Math.min(180, isNaN(targetInput) ? 100 : targetInput));

  const exerciseKey = params.exercise || 'NONE';
  
  // Garantia contra divisão por zero no roundingStep
  const roundingStepInput = Number(params.roundingStep || 0.5);
  const roundingStep = (isNaN(roundingStepInput) || roundingStepInput <= 0) ? 0.5 : roundingStepInput;

  if (validation.isHypo) {
    return {
      success: true,
      recommendedDose: 0,
      validation,
      breakdown: {
        foodBolus: 0,
        correctionBolus: 0,
        effectiveCorrection: 0,
        iobDiscount: 0,
        exerciseDiscount: 0,
        rawTotal: 0
      },
      auditHash: generateAuditHash(params, 0),
      timestamp: new Date().toISOString()
    };
  }

  const foodBolus = carbs / icr;
  const corrBolus = (bg - target) / isf;

  let effectiveCorrection = 0;
  let iobDiscount = 0;

  if (corrBolus > 0) {
    effectiveCorrection = Math.max(0, corrBolus - iob);
    iobDiscount = corrBolus - effectiveCorrection;
  } else {
    effectiveCorrection = corrBolus;
  }

  let rawTotal = foodBolus + effectiveCorrection;

  const exerciseMod = EXERCISE_MODIFIERS[exerciseKey] || EXERCISE_MODIFIERS.NONE;
  const exerciseDiscount = rawTotal > 0 ? rawTotal * exerciseMod.discountFactor : 0;
  rawTotal -= exerciseDiscount;

  if (rawTotal < 0) rawTotal = 0;
  
  if (rawTotal > SAFETY_LIMITS.MAX_BOLUS_SINGLE) {
    validation.warnings.push(`⚠️ A dose calculada (${rawTotal.toFixed(1)}U) excede o limite máximo de ${SAFETY_LIMITS.MAX_BOLUS_SINGLE}U e foi limitada por segurança.`);
    rawTotal = SAFETY_LIMITS.MAX_BOLUS_SINGLE;
  }

  const recommendedDose = Math.round(rawTotal / roundingStep) * roundingStep;
  const estimatedPost2h = Math.max(70, Math.round(bg + (carbs * 2) - (recommendedDose * isf * 0.6)));

  return {
    success: true,
    recommendedDose: Number(recommendedDose.toFixed(1)),
    rawTotal: Number(rawTotal.toFixed(2)),
    validation,
    breakdown: {
      foodBolus: Number(foodBolus.toFixed(2)),
      correctionBolus: Number(corrBolus.toFixed(2)),
      effectiveCorrection: Number(effectiveCorrection.toFixed(2)),
      iobDiscount: Number(iobDiscount.toFixed(2)),
      exerciseDiscount: Number(exerciseDiscount.toFixed(2)),
      estimatedPost2h
    },
    auditHash: generateAuditHash(params, recommendedDose),
    timestamp: new Date().toISOString()
  };
}

function generateAuditHash(params, dose) {
  const secretKey = process.env.AUDIT_SECRET || 'LEBEN_CLINICAL_SAFETY_AUDIT_KEY_V4';
  const data = JSON.stringify({ params, dose, secret: secretKey });
  return crypto.createHash('sha256').update(data).digest('hex');
}
