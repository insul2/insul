/**
 * Núcleo Matemático de Cálculo do Bolus de Insulina (Insul V4)
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

/**
 * Calcula a dose total recomendada de Bolus com descontos e regras de segurança.
 * @param {Object} params Parâmetros do cálculo
 * @returns {Object} Resultado detalhado do cálculo
 */
export function calculateBolus(params) {
  const validation = validateBolusInput(params);

  // Se houver erro impeditivo de validação, interrompe
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
  const target = Number(params.target || 100);
  const exerciseKey = params.exercise || 'NONE';
  const roundingStep = Number(params.roundingStep || 0.5); // Incremento do dispositivo (0.5U, 0.1U, 1.0U)

  // Se estiver em hipoglicemia (< 70 mg/dL), a dose é estritamente ZERO
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

  // 1. Bolus Alimentar (Food Bolus)
  const foodBolus = carbs / icr;

  // 2. Bolus Corretivo (Correction Bolus)
  const corrBolus = (bg - target) / isf;

  // 3. Desconto de Insulina Ativa (IOB) sobre o Bolus Corretivo
  // Regra médica clássica: IOB desconta apenas do bolus corretivo (evita hipoglicemia sem zerar comida)
  let effectiveCorrection = 0;
  let iobDiscount = 0;

  if (corrBolus > 0) {
    effectiveCorrection = Math.max(0, corrBolus - iob);
    iobDiscount = corrBolus - effectiveCorrection;
  } else {
    // Se a glicemia estiver abaixo do alvo (mas > 70), o corretivo é negativo e reduz a dose total
    effectiveCorrection = corrBolus;
  }

  // 4. Soma preliminar
  let rawTotal = foodBolus + effectiveCorrection;

  // 5. Ajuste de Exercício Físico
  const exerciseMod = EXERCISE_MODIFIERS[exerciseKey] || EXERCISE_MODIFIERS.NONE;
  const exerciseDiscount = rawTotal > 0 ? rawTotal * exerciseMod.discountFactor : 0;
  rawTotal -= exerciseDiscount;

  // 6. Não permitir doses negativas ou superiores ao limite de segurança por aplicação
  if (rawTotal < 0) rawTotal = 0;
  
  if (rawTotal > SAFETY_LIMITS.MAX_BOLUS_SINGLE) {
    validation.warnings.push(`⚠️ A dose calculada (${rawTotal.toFixed(1)}U) excede o limite máximo por aplicação (${SAFETY_LIMITS.MAX_BOLUS_SINGLE}U). A dose foi travada em ${SAFETY_LIMITS.MAX_BOLUS_SINGLE}U por segurança.`);
    rawTotal = SAFETY_LIMITS.MAX_BOLUS_SINGLE;
  }

  // 7. Arredondamento para a precisão da caneta / bomba (ex: 0.5U)
  const recommendedDose = Math.round(rawTotal / roundingStep) * roundingStep;

  // 8. Previsão Glicêmica Pós-Prandial (Gêmeo Digital simplificado)
  // Glicemia estimada em +2h
  const estimatedPost2h = Math.max(70, Math.round(bg + (carbs * 2) - (recommendedDose * isf * 0.6)));

  const result = {
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

  return result;
}

/**
 * Gera um Hash SHA-256 único de auditoria clínica para imutabilidade do registro.
 */
function generateAuditHash(params, dose) {
  const data = JSON.stringify({ params, dose, secret: 'AMANDA_V4_SAFETY_KEY' });
  return crypto.createHash('sha256').update(data).digest('hex');
}
