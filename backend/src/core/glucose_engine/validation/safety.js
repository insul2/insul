/**
 * Motor de Validação e Regras de Segurança Clínica (Insul / Xivia)
 * Padrão: ES Modules (ESM)
 */

export const SAFETY_LIMITS = {
  MIN_GLUCOSE: 20,       // mg/dL mínimo absoluto para cálculo
  HYPO_THRESHOLD: 70,    // mg/dL limite de hipoglicemia
  MAX_GLUCOSE: 600,      // mg/dL máximo razoável
  MAX_BOLUS_SINGLE: 25,  // Limite máximo de segurança por aplicação (25 Unidades)
  MIN_ICR: 1,            // g/U menor ICR permitido
  MAX_ICR: 150,          // g/U maior ICR permitido
  MIN_ISF: 5,            // mg/dL/U menor ISF permitido
  MAX_ISF: 300,          // mg/dL/U maior ISF permitido
};

export function validateBolusInput(input) {
  const errors = [];
  const warnings = [];

  const bg = Number(input.glucose);
  const carbs = Number(input.carbs || 0);
  const iob = Number(input.iob || 0);
  const icr = Number(input.icr);
  const isf = Number(input.isf);

  if (isNaN(icr) || icr < SAFETY_LIMITS.MIN_ICR || icr > SAFETY_LIMITS.MAX_ICR) {
    errors.push(`ICR inválido (${input.icr}). Deve estar entre ${SAFETY_LIMITS.MIN_ICR} e ${SAFETY_LIMITS.MAX_ICR} g/U.`);
  }

  if (isNaN(isf) || isf < SAFETY_LIMITS.MIN_ISF || isf > SAFETY_LIMITS.MAX_ISF) {
    errors.push(`ISF inválido (${input.isf}). Deve estar entre ${SAFETY_LIMITS.MIN_ISF} e ${SAFETY_LIMITS.MAX_ISF} mg/dL/U.`);
  }

  if (isNaN(bg) || bg < SAFETY_LIMITS.MIN_GLUCOSE || bg > SAFETY_LIMITS.MAX_GLUCOSE) {
    errors.push(`Glicemia inválida (${input.glucose} mg/dL). Deve estar entre ${SAFETY_LIMITS.MIN_GLUCOSE} e ${SAFETY_LIMITS.MAX_GLUCOSE} mg/dL.`);
  }

  const isHypo = bg < SAFETY_LIMITS.HYPO_THRESHOLD;
  if (isHypo) {
    warnings.push(`⚠️ HIPOGLICEMIA DETECTADA (${bg} mg/dL). Nenhuma dose de insulina deve ser aplicada. Consuma de 15g a 20g de carboidrato simples imediatamente.`);
  }

  if (carbs < 0) {
    errors.push('A quantidade de carboidratos não pode ser negativa.');
  }

  if (iob < 0) {
    errors.push('O valor de IOB (Insulina Ativa) não pode ser negativo.');
  }

  return {
    isValid: errors.length === 0,
    isHypo,
    errors,
    warnings
  };
}
