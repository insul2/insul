/**
 * 🧪 XIVIA CLINICAL MATH ENGINE — SUÍTE COMPLETA DE TESTES DE PRODUÇÃO (30 TESTES)
 * Validação de algoritmos clínicos, segurança de hipoglicemia, decaimento de IOB,
 * perfis circadianos, cálculo prandial/corretivo e imutabilidade SHA-256.
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
  console.log('🧪 Iniciando Suíte Completa de Produção (30 Testes Clínicos)...\n');

  // =========================================================================
  // BLOCO 1: SEGURANÇA E REGRA DE HIPOGLICEMIA (MÉDICO OBRIGATÓRIO)
  // =========================================================================
  console.log('--- [BLOCO 1] Trava de Segurança em Hipoglicemia ---');
  let r = calculateBolus({ glucose: 65, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.success === true, 'BG 65 mg/dL deve responder com sucesso');
  assert(r.recommendedDose === 0, 'Dose em hipoglicemia (65 mg/dL) deve ser estritamente 0U');
  assert(r.validation.isHypo === true, 'Flag isHypo deve ser true em 65 mg/dL');

  r = calculateBolus({ glucose: 69, carbs: 100, iob: 0, icr: 5, isf: 20 });
  assert(r.recommendedDose === 0, 'BG 69 mg/dL mesmo com 100g de carbo DEVE zerar a dose (Trava Hipo)');

  r = calculateBolus({ glucose: 70, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.validation.isHypo === false, 'BG 70 mg/dL é o limite exato de saída da hipoglicemia');

  // =========================================================================
  // BLOCO 2: CÁLCULO PRANDIAL PURAMENTE ALIMENTAR
  // =========================================================================
  console.log('\n--- [BLOCO 2] Cálculo Prandial (Alimentos) ---');
  r = calculateBolus({ glucose: 100, carbs: 50, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 5.0, '50g de carbo com ICR 10 em BG 100 mg/dL ➔ Dose 5.0U');

  r = calculateBolus({ glucose: 100, carbs: 60, iob: 0, icr: 12, isf: 40 });
  assert(r.recommendedDose === 5.0, '60g de carbo com ICR 12 ➔ 60/12 = 5.0U');

  r = calculateBolus({ glucose: 100, carbs: 45, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 4.5, '45g com ICR 10 ➔ Arredondamento para incremento 0.5U (4.5U)');

  r = calculateBolus({ glucose: 100, carbs: 12, iob: 0, icr: 10, isf: 40 });
  assert(r.recommendedDose === 1.0, '12g com ICR 10 ➔ 1.2U arredondado para 1.0U');

  // =========================================================================
  // BLOCO 3: CÁLCULO CORRETIVO (HIPERGLICEMIA)
  // =========================================================================
  console.log('\n--- [BLOCO 3] Correção de Hiperglicemia ---');
  r = calculateBolus({ glucose: 220, carbs: 0, iob: 0, icr: 10, isf: 40, targetGlucose: 100 });
  assert(r.recommendedDose === 3.0, 'BG 220, Alvo 100, ISF 40 ➔ (220-100)/40 = 3.0U');

  r = calculateBolus({ glucose: 180, carbs: 0, iob: 0, icr: 10, isf: 40, targetGlucose: 100 });
  assert(r.recommendedDose === 2.0, 'BG 180, Alvo 100, ISF 40 ➔ (180-100)/40 = 2.0U');

  r = calculateBolus({ glucose: 140, carbs: 40, iob: 0, icr: 10, isf: 40, targetGlucose: 100 });
  assert(r.recommendedDose === 5.0, 'Prandial 4.0U + Correção 1.0U ➔ Dose total 5.0U');

  // =========================================================================
  // BLOCO 4: DESCONTO CLINICO DE IOB (INSULINA ATIVA)
  // =========================================================================
  console.log('\n--- [BLOCO 4] Regra Clínica de Desconto de IOB ---');
  r = calculateBolus({ glucose: 180, carbs: 40, iob: 1.0, icr: 10, isf: 40, targetGlucose: 100 });
  assert(r.recommendedDose === 5.0, 'IOB 1.0U deve ser descontado da correção (6.0U - 1.0U = 5.0U)');
  assert(r.breakdown.iobDiscount === 1.0, 'Desconto de IOB no breakdown deve ser exatamente 1.0U');

  r = calculateBolus({ glucose: 100, carbs: 40, iob: 3.0, icr: 10, isf: 40, targetGlucose: 100 });
  assert(r.recommendedDose === 4.0, 'IOB alto (3.0U) NÃO deve descontar da comida quando BG está no alvo (100 mg/dL)');

  // =========================================================================
  // BLOCO 5: AJUSTES DE EXERCÍCIO FÍSICO
  // =========================================================================
  console.log('\n--- [BLOCO 5] Ajustes de Exercício Físico ---');
  r = calculateBolus({ glucose: 140, carbs: 50, iob: 0, icr: 10, isf: 40, exercise: 'WALK_30' });
  assert(r.recommendedDose < 6.0, 'Caminhada (WALK_30) deve reduzir a dose total calculada');

  r = calculateBolus({ glucose: 140, carbs: 50, iob: 0, icr: 10, isf: 40, exercise: 'RUN_30' });
  assert(r.recommendedDose === 4.0, 'Corrida (RUN_30) com 30% desc ➔ Dose 4.0U');

  // =========================================================================
  // BLOCO 6: SHA-256 HASH & IMUTABILIDADE DA AUDITORIA
  // =========================================================================
  console.log('\n--- [BLOCO 6] Imutabilidade e Hash SHA-256 ---');
  r = calculateBolus({ glucose: 140, carbs: 40, iob: 0.5, icr: 10, isf: 40 });
  assert(typeof r.auditHash === 'string', 'auditHash deve ser uma string');
  assert(r.auditHash.length === 64, 'SHA-256 deve ter exatamente 64 caracteres hexadecimais');

  const r2 = calculateBolus({ glucose: 140, carbs: 40, iob: 0.5, icr: 10, isf: 40 });
  assert(r.auditHash === r2.auditHash, 'Parâmetros idênticos DEVEM gerar a mesma hash SHA-256');

  // =========================================================================
  // BLOCO 7: MOTOR DE DECAIMENTO POLINOMIAL DO IOB
  // =========================================================================
  console.log('\n--- [BLOCO 7] Decaimento Biológico do IOB ---');
  let frac = calculateIOBFraction(0, 4.0);
  assert(frac === 1.0, 'IOB em t=0min deve ser 100% (1.0)');

  frac = calculateIOBFraction(240, 4.0);
  assert(frac === 0.0, 'IOB em t=240min (4h) deve ser 0% (0.0)');

  let rem = calculateRemainingIOB(5.0, 120, 4.0);
  assert(rem > 0 && rem < 5.0, 'IOB de 5U aos 120min (metade da DIA) deve ser parcial');

  assert(getInsulinDIA('HUMALOG') === 4.0, 'Humalog DIA deve ser 4.0 horas');
  assert(getInsulinDIA('FIASP') === 3.0, 'Fiasp DIA deve ser 3.0 horas (Ultra-rápida)');
  assert(getInsulinDIA('REGULAR') === 6.0, 'Insulina Regular DIA deve ser 6.0 horas');

  // =========================================================================
  // BLOCO 8: AUTO-CÁLCULO DE IOB A PARTIR DO HISTÓRICO
  // =========================================================================
  console.log('\n--- [BLOCO 8] Auto-Cálculo de IOB via Histórico ---');
  const mockHist = [
    { dose: 4.0, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { dose: 3.0, timestamp: new Date(Date.now() - 18000000).toISOString() }
  ];
  const autoIobRes = computeAutoIOB(mockHist, 'HUMALOG');
  assert(autoIobRes.totalIOB > 0, 'Dose de 1h atrás deve gerar IOB ativo > 0');
  assert(autoIobRes.activeDoses.length === 1, 'Dose de 5h atrás deve ser ignorada (expirada)');

  // =========================================================================
  // BLOCO 9: VALIDADOR DE PARÂMETROS E INPUTS DE SEGURANÇA
  // =========================================================================
  console.log('\n--- [BLOCO 9] Validador de Inputs de Segurança ---');
  let v = validateBolusInput({ glucose: 10, carbs: 10, iob: 0, icr: 10, isf: 40 });
  assert(v.isValid === false, 'Glicemia abaixo do mínimo absoluto (20 mg/dL) deve ser rejeitada');

  v = validateBolusInput({ glucose: 100, carbs: -5, iob: 0, icr: 10, isf: 40 });
  assert(v.isValid === false, 'Carboidratos negativos devem ser rejeitados');

  v = validateBolusInput({ glucose: 100, carbs: 50, iob: 0, icr: 0, isf: 40 });
  assert(v.isValid === false, 'ICR fora dos limites permitidos deve ser rejeitado');

  // =========================================================================
  // BLOCO 10: BANCO DE ALIMENTOS E BUSCA NUTRICIONAL
  // =========================================================================
  console.log('\n--- [BLOCO 10] Busca Nutricional e Tabela de Alimentos ---');
  const searchResults = await FoodService.searchFoods('arroz', 5);
  assert(Array.isArray(searchResults), 'Busca de alimentos deve retornar uma Array');
  assert(searchResults.length > 0, 'Busca por "arroz" deve retornar resultados');
  assert(searchResults[0].carbs_g !== undefined, 'Item retornado deve ter propriedade carbs_g');
  assert(searchResults[0].carbs_g > 0, 'Primeiro resultado de arroz deve ter carboidratos > 0g');

  // =========================================================================
  // RESUMO GERAL DOS TESTES
  // =========================================================================
  console.log('\n======================================================');
  console.log(`📊 RESULTADO FINAL DA SUÍTE DE TESTES:`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`🎯 Total de Testes Executados: ${passed + failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
