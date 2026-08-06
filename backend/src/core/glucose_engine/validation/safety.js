/**
 * 🌿 Motor de Validação e Regras de Segurança Clínica — LEBEN Engine V4.0
 * Padrão: ES Modules (ESM) — Conformidade IEC 62304 / SBD / ADA / ISO 14971
 */

export const SAFETY_LIMITS = {
  MIN_GLUCOSE: 20,         // mg/dL mínimo absoluto
  CRITICAL_LOW: 25,        // mg/dL emergência extrema
  HYPO_THRESHOLD: 70,      // mg/dL limite de hipoglicemia
  MAX_GLUCOSE: 600,        // mg/dL máximo razoável
  MAX_CARBS_WARN: 300,     // g de carbo alerta para revisão
  MAX_IOB_WARN: 40,        // U de IOB alerta para revisão
  MAX_BOLUS_SINGLE: 25,    // Limite automático de alerta para confirmação manual (25 U)
  MIN_ICR: 1,              // g/U
  MAX_ICR: 150,            // g/U
  MIN_ISF: 5,              // mg/dL/U
  MAX_ISF: 300,            // mg/dL/U
};

// Perfis Clínicos de Pacientes e Metas de Glicemia Alvo Recomendadas
export const PATIENT_PROFILES = {
  ADULT: { key: 'ADULT', label: 'Adulto Geral', targetGlucose: 100 },
  PREGNANT: { key: 'PREGNANT', label: 'Gestante (Controle Estrito)', targetGlucose: 90 },
  CHILD: { key: 'CHILD', label: 'Criança / Pediatria', targetGlucose: 120 },
  ELDERLY: { key: 'ELDERLY', label: 'Idoso / Prevenção Hipo', targetGlucose: 140 }
};

/**
 * Valida se um valor bruto de entrada é numericamente seguro para uso clínico.
 * Rejeita: strings, null, undefined, NaN, Infinity, -Infinity.
 * @param {*} value - Valor bruto do input
 * @returns {boolean}
 */
function isNumericallySafe(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  const n = Number(value);
  return !isNaN(n) && isFinite(n);
}

export function validateBolusInput(input) {
  const errors = [];
  const warnings = [];

  // --- Validação de Tipo Numérico (RT-02: previne NaN e crash) ---
  if (!isNumericallySafe(input.glucose)) {
    errors.push(`Glicemia inválida: o valor "${input.glucose}" não é um número válido.`);
  }
  if (input.carbs !== undefined && input.carbs !== null && !isNumericallySafe(input.carbs)) {
    errors.push(`Carboidratos inválidos: o valor "${input.carbs}" não é um número válido.`);
  }
  if (input.iob !== undefined && input.iob !== null && !isNumericallySafe(input.iob)) {
    errors.push(`IOB inválido: o valor "${input.iob}" não é um número válido.`);
  }
  if (!isNumericallySafe(input.icr)) {
    errors.push(`ICR inválido: o valor "${input.icr}" não é um número válido.`);
  }
  if (!isNumericallySafe(input.isf)) {
    errors.push(`ISF inválido: o valor "${input.isf}" não é um número válido.`);
  }

  // Retorno antecipado: se os tipos são inválidos, não continuar para evitar NaN nas comparações
  if (errors.length > 0) {
    return { isValid: false, isHypo: false, errors, warnings };
  }

  // --- Validação de Faixas Clínicas ---
  const bg = Number(input.glucose);
  const carbs = Number(input.carbs ?? 0);
  const iob = Number(input.iob ?? 0);
  const icr = Number(input.icr);
  const isf = Number(input.isf);

  if (icr < SAFETY_LIMITS.MIN_ICR || icr > SAFETY_LIMITS.MAX_ICR) {
    errors.push(`ICR inválido (${icr}). Deve estar entre ${SAFETY_LIMITS.MIN_ICR} e ${SAFETY_LIMITS.MAX_ICR} g/U.`);
  }

  if (isf < SAFETY_LIMITS.MIN_ISF || isf > SAFETY_LIMITS.MAX_ISF) {
    errors.push(`ISF inválido (${isf}). Deve estar entre ${SAFETY_LIMITS.MIN_ISF} e ${SAFETY_LIMITS.MAX_ISF} mg/dL/U.`);
  }

  if (bg < SAFETY_LIMITS.MIN_GLUCOSE || bg > SAFETY_LIMITS.MAX_GLUCOSE) {
    errors.push(`Glicemia inválida (${bg} mg/dL). Deve estar entre ${SAFETY_LIMITS.MIN_GLUCOSE} e ${SAFETY_LIMITS.MAX_GLUCOSE} mg/dL.`);
  }

  if (bg <= SAFETY_LIMITS.CRITICAL_LOW) {
    warnings.push(`🚨 EMERGÊNCIA EXTREMA: Glicemia em ${bg} mg/dL. Risco de perda de consciência. Acione ajuda médica e consuma carboidrato rápido imediatamente.`);
  } else if (bg < SAFETY_LIMITS.HYPO_THRESHOLD) {
    warnings.push(`🛑 APLICAÇÃO BLOQUEADA TEMPORARIAMENTE: Hipoglicemia detectada (${bg} mg/dL). Tratar imediatamente com 15g de carboidrato rápido e recalcular após nova medição.`);
  }

  if (carbs > SAFETY_LIMITS.MAX_CARBS_WARN) {
    warnings.push(`⚠️ ALERTA DE REFEIÇÃO EXTREMA: ${carbs}g de carboidratos excede 300g. Verifique a quantidade digitada.`);
  }

  if (iob > SAFETY_LIMITS.MAX_IOB_WARN) {
    warnings.push(`⚠️ ALERTA DE IOB ELEVADO: Insulina Ativa em ${iob}U. Verifique se os dados estão corretos.`);
  }

  if (carbs < 0) {
    errors.push('A quantidade de carboidratos não pode ser negativa.');
  }

  if (iob < 0) {
    errors.push('O valor de IOB (Insulina Ativa) não pode ser negativo.');
  }

  return {
    isValid: errors.length === 0,
    isHypo: bg < SAFETY_LIMITS.HYPO_THRESHOLD,
    errors,
    warnings
  };
}
