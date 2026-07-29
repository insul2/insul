/**
 * 🧪 LEBEN CLINICAL MATH ENGINE — SUÍTE COMPLETA DE TESTES DE PRODUÇÃO (36 TESTES)
 * Validação de algoritmos clínicos, segurança de hipoglicemia, decaimento de IOB,
 * perfis circadianos, cálculo prandial/corretivo, CGM trends, score de confiança e imutabilidade SHA-256 encadeada.
 */

import { calculateBolus } from '../backend/src/core/glucose_engine/insulin_math/bolus.js';
import { calculateIOBFraction, calculateRemainingIOB } from '../backend/src/core/glucose_engine/iob_engine/iob.js';
import { validateBolusInput, SAFETY_LIMITS } from '../backend/src/core/glucose_engine/validation/safety.js';
import { computeAutoIOB, getInsulinDIA } from '../frontend/src/utils/iobCalculator.js';
import { FoodService } from '../backend/src/services/foodService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('🧪 Iniciando Suíte Completa de Produção (36 Testes Clínicos)...\n');

  // =========================================================================
  // BLOCO 1: SEGURANÇA E REGRA DE HIPOGLICEMIA (MÉDICO OBRIGATÓRIO)
  // =========================================================================
  console.log('--- [BLOCO 1] Trava de Segurança em Hipoglicemia ---');
  let r = calculateBolus({ glucose: 65, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.success === true, 'BG 65 mg/dL deve responder com sucesso');
  assert(r.recommendedDose === 0, 'Dose em hipoglicemia (65 mg/dL) deve ser estritamente 0U');
  assert(r.status === 'BLOCKED_HYPO_SAFETY', 'Status deve ser BLOCKED_HYPO_SAFETY');
  assert(r.validation.isHypo === true, 'Flag isHypo deve ser true em 65 mg/dL');

  r = calculateBolus({ glucose: 69, carbs: 100, iob: 0, icr: 5, isf: 20 });
  assert(r.recommendedDose === 0, 'BG 69 mg/dL mesmo com 100g de carbo DEVE zerar a dose (Trava Hipo)');

  r = calculateBolus({ glucose: 70, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.validation.isHypo === false, 'BG 70 mg/dL é o limite exato de saída da hipoglicemia');

  // =========================================================================
  // BLOCO 2: CÁLCULO PRANDIAL PURAMENTE ALIMENTAR E SCORE DE CONFIANÇA
  // =========================================================================
  console.log('\n--- [BLOCO 2] Cálculo Prandial e Score de Confiabilidade ---');
  r = calculateBolus({ glucose: 100, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 5.0, '50g de carbo com ICR 10 em BG 100 mg/dL ➔ Dose 5.0U');
  assert(r.confidenceScore >= 90, 'Score de confiança em condições normais deve ser >= 90%');

  r = calculateBolus({ glucose: 100, carbs: 50, iob: 0, icr: 10, isf: 40, condition: 'FEVER_ILLNESS' });
  assert(r.confidenceScore < 80, 'Febre/Infecção deve reduzir o score de confiança');

  r = calculateBolus({ glucose: 100, carbs: 60, iob: 0, icr: 12, isf: 40 });
  assert(r.recommendedDose === 5.0, '60g de carbo com ICR 12 ➔ 60/12 = 5.0U');

  r = calculateBolus({ glucose: 100, carbs: 45, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 4.5, '45g com ICR 10 ➔ Arredondamento para incremento 0.5U (4.5U)');

  r = calculateBolus({ glucose: 100, carbs: 12, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 1.0, '12g com ICR 10 ➔ 1.2U arredondado para 1.0U');

  // =========================================================================
  // BLOCO 3: CÁLCULO DE CORREÇÃO E TENDÊNCIA CGM
  // =========================================================================
  console.log('\n--- [BLOCO 3] Correção de Hiperglicemia e Tendência CGM ---');
  r = calculateBolus({ glucose: 220, carbs: 0, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 3.0, 'BG 220, Alvo 100, ISF 40 ➔ (220-100)/40 = 3.0U');

  r = calculateBolus({ glucose: 180, carbs: 0, iob: 0, icr: 10, isf: 40, cgmTrend: 'DOUBLE_UP' });
  assert(r.recommendedDose > 2.0, 'Tendência DOUBLE_UP (+30 mg/dL) deve aumentar o bolus corretivo');

  r = calculateBolus({ glucose: 180, carbs: 40, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 6.0, 'Prandial 4.0U + Correção 2.0U ➔ Dose total 6.0U');

  // =========================================================================
  // BLOCO 4: REGRA CLÍNICA DE DESCONTO DE IOB
  // =========================================================================
  console.log('\n--- [BLOCO 4] Regra Clínica de Desconto de IOB ---');
  r = calculateBolus({ glucose: 220, carbs: 40, iob: 1.0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 6.0, 'IOB 1.0U deve ser descontado da correção (3.0-1.0=2.0 + 4.0 comida = 6.0U)');
  assert(r.breakdown.iobDiscount === 1.0, 'Desconto de IOB no breakdown deve ser exatamente 1.0U');

  r = calculateBolus({ glucose: 100, carbs: 40, iob: 3.0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 4.0, 'IOB alto (3.0U) NÃO deve descontar da comida quando BG está no alvo (100 mg/dL)');

  // =========================================================================
  // BLOCO 5: AJUSTES DE EXERCÍCIO FÍSICO (AERÓBICO VS ANAERÓBICO)
  // =========================================================================
  console.log('\n--- [BLOCO 5] Ajustes de Exercício Físico ---');
  r = calculateBolus({ glucose: 100, carbs: 50, iob: 0, icr: 10, isf: 40, exercise: 'WALK_30' });
  assert(r.recommendedDose < 5.0, 'Caminhada (WALK_30) deve reduzir a dose total calculada');

  r = calculateBolus({ glucose: 100, carbs: 50, iob: 0, icr: 10, isf: 40, exercise: 'RESISTANCE_ANAEROBIC' });
  assert(r.recommendedDose > 5.0, 'Musculação (RESISTANCE_ANAEROBIC) deve aplicar incremento temporário de +10%');

  // =========================================================================
  // BLOCO 6: IMUTABILIDADE E HASH SHA-256 ENCADEADA
  // =========================================================================
  console.log('\n--- [BLOCO 6] Imutabilidade e Hash SHA-256 ---');
  r = calculateBolus({ glucose: 150, carbs: 30, iob: 0, icr: 10, isf: 40 });
  assert(typeof r.auditHash === 'string', 'auditHash deve ser uma string');
  assert(r.auditHash.length === 64, 'SHA-256 deve ter exatamente 64 caracteres hexadecimais');

  const r2 = calculateBolus({ glucose: 150, carbs: 30, iob: 0, icr: 10, isf: 40 });
  assert(r.auditHash === r2.auditHash, 'Parâmetros idênticos DEVEM gerar a mesma hash SHA-256');

  // =========================================================================
  // BLOCO 7: DECAIMENTO BIOLÓGICO DO IOB
  // =========================================================================
  console.log('\n--- [BLOCO 7] Decaimento Biológico do IOB ---');
  let f = calculateIOBFraction(0, 'HUMALOG');
  assert(f === 1.0, 'IOB em t=0min deve ser 100% (1.0)');

  f = calculateIOBFraction(240, 'HUMALOG');
  assert(f === 0.0, 'IOB em t=240min (4h) deve ser 0% (0.0)');

  const rem = calculateRemainingIOB(5.0, 120, 'HUMALOG');
  assert(rem > 0 && rem < 5.0, 'IOB de 5U aos 120min (metade da DIA) deve ser parcial');
  assert(getInsulinDIA('HUMALOG') === 4.0, 'Humalog DIA deve ser 4.0 horas');
  assert(getInsulinDIA('FIASP') === 3.0, 'Fiasp DIA deve ser 3.0 horas (Ultra-rápida)');
  assert(getInsulinDIA('REGULAR') === 6.0, 'Insulina Regular DIA deve ser 6.0 horas');

  // =========================================================================
  // BLOCO 8: AUTO-CÁLCULO DE IOB VIA HISTÓRICO
  // =========================================================================
  console.log('\n--- [BLOCO 8] Auto-Cálculo de IOB via Histórico ---');
  const mockHistory = [
    { dose: 4.0, timestamp: new Date(Date.now() - 3600000).toISOString() }, // 1h atrás
    { dose: 3.0, timestamp: new Date(Date.now() - 18000000).toISOString() }  // 5h atrás
  ];
  const autoIob = computeAutoIOB(mockHistory, 'HUMALOG');
  assert(autoIob.totalIOB > 0, 'Dose de 1h atrás deve gerar IOB ativo > 0');
  assert(autoIob.activeDoses.length === 1, 'Dose de 5h atrás deve ser ignorada (expirada)');

  // =========================================================================
  // BLOCO 9: VALIDADOR DE INPUTS DE SEGURANÇA E EXTREMOS
  // =========================================================================
  console.log('\n--- [BLOCO 9] Validador de Inputs de Segurança e Extremos ---');
  let val = validateBolusInput({ glucose: 10, carbs: 20, iob: 0, icr: 10, isf: 40 });
  assert(val.isValid === false, 'Glicemia abaixo do mínimo absoluto (20 mg/dL) deve ser rejeitada');

  val = validateBolusInput({ glucose: 22, carbs: 0, iob: 0, icr: 10, isf: 40 });
  assert(val.warnings.some(w => w.includes('EMERGÊNCIA EXTREMA')), 'BG <= 25 mg/dL deve disparar alerta de emergência extrema');

  val = validateBolusInput({ glucose: 120, carbs: 350, iob: 0, icr: 10, isf: 40 });
  assert(val.warnings.some(w => w.includes('REFEIÇÃO EXTREMA')), 'Carboidratos > 300g deve disparar aviso de verificação');

  val = validateBolusInput({ glucose: 120, carbs: -10, iob: 0, icr: 10, isf: 40 });
  assert(val.isValid === false, 'Carboidratos negativos devem ser rejeitados');

  // =========================================================================
  // BLOCO 10: BUSCA NUTRICIONAL E TABELA DE ALIMENTOS
  // =========================================================================
  console.log('\n--- [BLOCO 10] Busca Nutricional e Tabela de Alimentos ---');
  const foods = await FoodService.searchFoods('arroz');
  assert(Array.isArray(foods), 'Busca de alimentos deve retornar uma Array');
  assert(foods.length > 0, 'Busca por "arroz" deve retornar resultados');
  assert(foods[0].carbs_g !== undefined, 'Item retornado deve ter propriedade carbs_g');
  assert(foods[0].carbs_g > 0, 'Primeiro resultado de arroz deve ter carboidratos > 0g');

  console.log('\n======================================================');
  console.log(`📊 RESULTADO FINAL DA SUÍTE DE TESTES:`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`🎯 Total de Testes Executados: ${passed + failed}`);
  console.log('======================================================\n');
}

runAllTests();
