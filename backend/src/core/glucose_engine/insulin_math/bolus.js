/**
 * 🌿 Núcleo Matemático do Bolus de Insulina — LEBEN Clinical Engine V4.0
 * Padrão: ES Modules (ESM) — Conformidade IEC 62304 / ISO 14971 / SBD / ADA
 */

import crypto from 'crypto';
import { validateBolusInput, SAFETY_LIMITS, PATIENT_PROFILES } from '../validation/safety.js';
import { calculateIOBFraction } from '../iob_engine/iob.js';

export const EXERCISE_MODIFIERS = {
  NONE: { key: 'NONE', label: 'Repouso / Sem Exercício', discountFactor: 0.0 },
  WALK_30: { key: 'WALK_30', label: 'Caminhada Leve (30 min)', discountFactor: 0.15 },
  RUN_30: { key: 'RUN_30', label: 'Exercício Moderado / Corrida (30 min)', discountFactor: 0.30 },
  INTENSE_60: { key: 'INTENSE_60', label: 'Treino Intenso Aeróbico (60 min)', discountFactor: 0.40 },
  RESISTANCE_ANAEROBIC: { key: 'RESISTANCE_ANAEROBIC', label: 'Musculação / HIIT (Anaeróbico - Pico Temporário)', discountFactor: -0.10 }
};

export const CGM_TREND_MODIFIERS = {
  DOUBLE_UP: { key: 'DOUBLE_UP', label: '⬆️⬆️ Subindo Rápido (>2 mg/dL/min)', bgAdjustment: 30 },
  SINGLE_UP: { key: 'SINGLE_UP', label: '⬆️ Subindo (1-2 mg/dL/min)', bgAdjustment: 15 },
  FORTY_FIVE_UP: { key: 'FORTY_FIVE_UP', label: '↗️ Subindo Leve (0.5-1 mg/dL/min)', bgAdjustment: 8 },
  FLAT: { key: 'FLAT', label: '➡️ Estável (-0.5 a 0.5 mg/dL/min)', bgAdjustment: 0 },
  FORTY_FIVE_DOWN: { key: 'FORTY_FIVE_DOWN', label: '↘️ Caindo Leve (-0.5 a -1 mg/dL/min)', bgAdjustment: -8 },
  SINGLE_DOWN: { key: 'SINGLE_DOWN', label: '⬇️ Caindo (-1 a -2 mg/dL/min)', bgAdjustment: -15 },
  DOUBLE_DOWN: { key: 'DOUBLE_DOWN', label: '⬇️⬇️ Caindo Rápido (>-2 mg/dL/min)', bgAdjustment: -30 }
};

export const CLINICAL_CONDITIONS = {
  NONE: { key: 'NONE', label: 'Saúde Normal / Sem Sintomas', doseModifier: 0.0, confidencePenalty: 0 },
  FEVER_ILLNESS: { key: 'FEVER_ILLNESS', label: 'Febre / Infecção (+20% Resposta Cortisol)', doseModifier: 0.20, confidencePenalty: 20 },
  STRESS: { key: 'STRESS', label: 'Estresse Intenso (+15% Adrenalina)', doseModifier: 0.15, confidencePenalty: 15 },
  STEROIDS: { key: 'STEROIDS', label: 'Uso de Corticoides (+30% Resistência)', doseModifier: 0.30, confidencePenalty: 25 }
};

export const MEAL_ABSORPTION_TYPES = {
  FAST: { key: 'FAST', label: 'Absorção Rápida (Sucos, Açúcar)', durationMin: 60, splitRecommended: false },
  MODERATE: { key: 'MODERATE', label: 'Absorção Moderada (Arroz, Pão)', durationMin: 120, splitRecommended: false },
  SLOW_FPU: { key: 'SLOW_FPU', label: 'Absorção Lenta / FPU (Pizza, Gorduras)', durationMin: 240, splitRecommended: true, text: 'Refeição rica em gordura/proteína. Recomendado fracionamento da dose (Bolus Estendido/Dual Wave).' }
};

export function calculateRecommendedPreBolus(glucoseMgDl) {
  const bg = Number(glucoseMgDl);
  if (bg < 80) return { minutes: 0, advice: 'Glicemia < 80 mg/dL: Não antecipar a dose. Aplicar junto ou logo após a refeição.' };
  if (bg <= 120) return { minutes: 10, advice: 'Glicemia 80-120 mg/dL: Pré-bolus ideal de 10 minutos.' };
  if (bg <= 180) return { minutes: 15, advice: 'Glicemia 120-180 mg/dL: Pré-bolus ideal de 15 minutos.' };
  if (bg <= 250) return { minutes: 20, advice: 'Glicemia 180-250 mg/dL: Pré-bolus recomendado de 20 minutos.' };
  return { minutes: 25, advice: 'Glicemia > 250 mg/dL: Pré-bolus de 25 minutos para aguardar o início da ação da insulina.' };
}

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

  const bgInput = Number(params.glucose);
  const carbs = Number(params.carbs || 0);
  const iob = Number(params.iob || 0);
  const icr = Number(params.icr);
  const isf = Number(params.isf);
  const insulinType = (params.insulinType || 'HUMALOG').toUpperCase();
  const mealTypeKey = params.mealType || 'MODERATE';
  const profileKey = params.patientProfile || 'ADULT';
  const cgmTrendKey = params.cgmTrend || 'FLAT';
  const conditionKey = params.condition || 'NONE';

  // 1. Ajuste Glicêmico por Tendência CGM (mg/dL/min)
  const cgmMod = CGM_TREND_MODIFIERS[cgmTrendKey] || CGM_TREND_MODIFIERS.FLAT;
  const bg = bgInput + cgmMod.bgAdjustment;

  // 2. Meta de Glicemia Alvo baseada no perfil
  const patientProfile = PATIENT_PROFILES[profileKey] || PATIENT_PROFILES.ADULT;
  const target = Number(params.target || patientProfile.targetGlucose || 100);

  const exerciseKey = params.exercise || 'NONE';
  const roundingStep = Number(params.roundingStep || params.doseIncrement || 0.5);

  if (validation.isHypo) {
    return {
      success: true,
      status: 'BLOCKED_HYPO_SAFETY',
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
      auditHash: generateChainAuditHash(params, 0, 'BLOCKED_HYPO_SAFETY'),
      timestamp: new Date().toISOString()
    };
  }

  // 3. Dose Prandial (Comida)
  const foodBolus = carbs / icr;

  // 4. Dose de Correção (Hiperglicemia ajustada por CGM)
  const corrBolus = (bg - target) / isf;

  // 5. Desconto de IOB apenas na Correção
  let effectiveCorrection = 0;
  let iobDiscount = 0;

  if (corrBolus > 0) {
    effectiveCorrection = Math.max(0, corrBolus - iob);
    iobDiscount = corrBolus - effectiveCorrection;
  } else {
    effectiveCorrection = corrBolus;
  }

  let rawTotal = foodBolus + effectiveCorrection;

  // 6. Ajuste por Condições Clínicas Especiais (Febre, Estresse, Corticoides)
  const condMod = CLINICAL_CONDITIONS[conditionKey] || CLINICAL_CONDITIONS.NONE;
  const conditionAdjustment = rawTotal > 0 ? rawTotal * condMod.doseModifier : 0;
  rawTotal += conditionAdjustment;

  // 7. Ajuste por Exercício Físico
  const exerciseMod = EXERCISE_MODIFIERS[exerciseKey] || EXERCISE_MODIFIERS.NONE;
  const exerciseDiscount = rawTotal > 0 ? rawTotal * exerciseMod.discountFactor : 0;
  rawTotal -= exerciseDiscount;

  if (rawTotal < 0) rawTotal = 0;

  // 8. Alerta Teto e Confirmação Manual Transparente
  let requiresManualConfirmation = false;
  let cappedDose = rawTotal;

  if (rawTotal > SAFETY_LIMITS.MAX_BOLUS_SINGLE) {
    requiresManualConfirmation = true;
    cappedDose = SAFETY_LIMITS.MAX_BOLUS_SINGLE;
    validation.warnings.push(`⚠️ Dose calculada (${rawTotal.toFixed(1)}U) excede o limite automático de ${SAFETY_LIMITS.MAX_BOLUS_SINGLE}U. Requer confirmação médica manual.`);
  }

  // 9. Arredondamento Configurável
  const recommendedDose = Math.round(rawTotal / roundingStep) * roundingStep;

  // 10. Cálculo do Score de Confiabilidade %
  let confidenceScore = 95;
  confidenceScore -= condMod.confidencePenalty;
  if (carbs > 150) confidenceScore -= 10;
  if (iob > 10) confidenceScore -= 10;
  confidenceScore = Math.max(50, Math.min(98, confidenceScore));

  // 11. Recomendações e Simulação Preditiva
  const preBolusTiming = calculateRecommendedPreBolus(bgInput);
  const mealAbsorption = MEAL_ABSORPTION_TYPES[mealTypeKey] || MEAL_ABSORPTION_TYPES.MODERATE;
  const predictions = simulatePredictiveGlucosePoints(bgInput, carbs, recommendedDose, iob, isf, icr, insulinType);

  const auditHash = generateChainAuditHash(params, recommendedDose, 'APPROVED');

  return {
    success: true,
    status: 'APPROVED',
    recommendedDose: Number(recommendedDose.toFixed(2)),
    rawTotal: Number(rawTotal.toFixed(2)),
    requiresManualConfirmation,
    cappedDose: Number(cappedDose.toFixed(2)),
    confidenceScore,
    validation,
    breakdown: {
      foodBolus: Number(foodBolus.toFixed(2)),
      correctionBolus: Number(corrBolus.toFixed(2)),
      effectiveCorrection: Number(effectiveCorrection.toFixed(2)),
      iobDiscount: Number(iobDiscount.toFixed(2)),
      exerciseDiscount: Number(exerciseDiscount.toFixed(2)),
      conditionAdjustment: Number(conditionAdjustment.toFixed(2)),
      rawTotal: Number(rawTotal.toFixed(2))
    },
    clinicalGuidance: {
      preBolusTiming,
      mealAbsorption,
      patientProfile,
      cgmTrend: cgmMod,
      clinicalCondition: condMod
    },
    predictions,
    auditHash,
    versioning: {
      engineVersion: '4.0.0-LEBEN-CLINICAL',
      algorithmVersion: '4.0.0-CLINICAL-ISO14971',
      mathModel: '2.1-HOVORKA-EXTENDED',
      iobCurveModel: insulinType === 'FIASP' ? 'WILINSKA-FIASP-V2' : 'WILINSKA-STANDARD-V2'
    },
    timestamp: new Date().toISOString()
  };
}

function simulatePredictiveGlucosePoints(bg, carbs, dose, iob, isf, icr, insulinType) {
  const points = [];
  const intervals = [30, 60, 90, 120, 180, 240];

  for (const min of intervals) {
    const iobFrac = calculateIOBFraction(min, insulinType);
    const activeInsulinDrawn = dose * (1 - iobFrac);
    const bgDrop = activeInsulinDrawn * isf;

    const carbFraction = Math.min(1.0, min / 120);
    const bgRise = (carbs / (icr || 10)) * isf * carbFraction;

    const estimatedBg = Math.max(40, Math.round(bg + bgRise - bgDrop));
    points.push({ minute: min, estimatedGlucose: estimatedBg });
  }

  return points;
}

export function generateChainAuditHash(params, dose, status) {
  const payload = [
    'ENGINE_V4.0.0-LEBEN-CLINICAL',
    'ALGO_4.0.0-CLINICAL-ISO14971',
    String(params.glucose),
    String(params.carbs || 0),
    String(params.iob || 0),
    String(params.icr),
    String(params.isf),
    String(params.insulinType || 'HUMALOG'),
    String(params.exercise || 'NONE'),
    String(params.patientProfile || 'ADULT'),
    String(params.cgmTrend || 'FLAT'),
    String(params.condition || 'NONE'),
    String(params.userId || 'usr_anonymous'),
    String(params.deviceId || 'device_web'),
    String(params.previousHash || 'GENESIS_HASH'),
    String(dose),
    String(status),
    process.env.AUDIT_SECRET || 'LEBEN_CLINICAL_SAFETY_AUDIT_KEY_V4'
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}
