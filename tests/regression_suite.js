/**
 * 🧪 LEBEN CLINICAL ENGINE — SUÍTE DE TESTES DE REGRESSÃO AUTOMATIZADA (FASE 6)
 * Validação permanente dos 11 achados críticos corrigidos nas Fases 1 a 5.
 * Garantia de Regressão Zero conforme IEC 62304 / ISO 14971.
 */

import { calculateBolus } from '../backend/src/core/glucose_engine/insulin_math/bolus.js';
import { calculateIOBFraction } from '../backend/src/core/glucose_engine/insulin_math/../iob_engine/iob.js';
import { validateBolusInput } from '../backend/src/core/glucose_engine/validation/safety.js';
import { getGlucoseReadingsHandler, logGlucoseReadingHandler } from '../backend/src/controllers/glucoseController.js';
import { registerHandler } from '../backend/src/controllers/authController.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [REGRESSÃO PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`❌ [REGRESSÃO FAILED]: ${message}`);
    failed++;
  }
}

/** Helper mock para req/res do Express */
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

async function runRegressionSuite() {
  console.log('🛡️  INICIANDO SUÍTE DE TESTES DE REGRESSÃO AUTOMATIZADA (FASE 6)\n');

  // =========================================================================
  // REGRESSÃO 1: RT-02 — Validação de Tipo Numérico (Glicemia, Carbs, IOB String/NaN)
  // =========================================================================
  console.log('--- [REGRESSÃO RT-02] Injeção de Strings e Valores Não-Numéricos ---');
  let res = calculateBolus({ glucose: 150, carbs: 'trinta', icr: 10, isf: 40 });
  assert(res.success === false, 'carbs="trinta" deve retornar success: false');
  assert(res.validation.errors.some(e => e.includes('Carboidratos inválidos')), 'Erro deve mencionar Carboidratos inválidos');

  res = calculateBolus({ glucose: 'duzentos', carbs: 30, icr: 10, isf: 40 });
  assert(res.success === false, 'glucose="duzentos" deve retornar success: false');

  res = calculateBolus({ glucose: 150, carbs: 30, iob: null, icr: 10, isf: 40 });
  assert(res.success === true, 'iob=null deve ser aceito como 0U sem NaN');
  assert(!isNaN(res.recommendedDose), 'recommendedDose não pode ser NaN com iob=null');

  // =========================================================================
  // REGRESSÃO 2: GAP-03 — Guard para roundingStep = 0
  // =========================================================================
  console.log('\n--- [REGRESSÃO GAP-03] Arredondamento com roundingStep = 0 ---');
  res = calculateBolus({ glucose: 150, carbs: 30, icr: 10, isf: 40, roundingStep: 0 });
  assert(res.success === true, 'roundingStep=0 deve responder com sucesso (usando fallback)');
  assert(!isNaN(res.recommendedDose), 'recommendedDose não pode ser NaN');
  assert(res.recommendedDose === 4.5, 'Dose 4.25U arredondada com passo 0.5U fallback ➔ 4.5U');

  // =========================================================================
  // REGRESSÃO 3: CROSS-01 — Suporte a targetGlucose Customizado
  // =========================================================================
  console.log('\n--- [REGRESSÃO CROSS-01] Respeito a targetGlucose Customizado ---');
  const resTarget140 = calculateBolus({ glucose: 200, carbs: 50, icr: 10, isf: 40, targetGlucose: 140 });
  const resTarget100 = calculateBolus({ glucose: 200, carbs: 50, icr: 10, isf: 40, targetGlucose: 100 });
  assert(resTarget140.recommendedDose === 6.5, 'targetGlucose=140 em BG 200 (idoso) ➔ Dose 6.5U');
  assert(resTarget100.recommendedDose === 7.5, 'targetGlucose=100 em BG 200 (padrão) ➔ Dose 7.5U');
  assert(resTarget140.recommendedDose < resTarget100.recommendedDose, 'Alvo maior (140) DEVE resultar em menor dose corretiva que alvo menor (100)');

  // =========================================================================
  // REGRESSÃO 4: CROSS-03 — Suporte a customDiaHours Personalizado no IOB
  // =========================================================================
  console.log('\n--- [REGRESSÃO CROSS-03] Decaimento com customDiaHours do Paciente ---');
  const fracStandard = calculateIOBFraction(120, 'HUMALOG', null);
  const fracCustom = calculateIOBFraction(120, 'HUMALOG', 6.0); // Paciente com metabolização lenta (6h)
  assert(fracCustom > fracStandard, 'DIA de 6h aos 120min deve reter MAIS insulina ativa do que DIA padrão de 4h');

  // =========================================================================
  // REGRESSÃO 5: RT-07 — Bloqueio de Acesso Não Autenticado (Sem Tenant anonymous)
  // =========================================================================
  console.log('\n--- [REGRESSÃO RT-07] Rejeição HTTP 401 sem Token ---');
  const mockReqNoAuth = { user: null };
  const mockRes1 = createMockRes();
  await getGlucoseReadingsHandler(mockReqNoAuth, mockRes1);
  assert(mockRes1.statusCode === 401, 'getGlucoseReadings sem auth deve retornar HTTP 401');

  const mockRes2 = createMockRes();
  await logGlucoseReadingHandler(mockReqNoAuth, mockRes2);
  assert(mockRes2.statusCode === 401, 'logGlucoseReading sem auth deve retornar HTTP 401');

  // =========================================================================
  // REGRESSÃO 6: RT-06 — Sanitização de userId Contra NoSQL Injection
  // =========================================================================
  console.log('\n--- [REGRESSÃO RT-06] Rejeição de NoSQL Injection em userId ---');
  const mockReqNoSQL = { user: { id: { $ne: null } } };
  const mockRes3 = createMockRes();
  await getGlucoseReadingsHandler(mockReqNoSQL, mockRes3);
  assert(mockRes3.statusCode === 400 || mockRes3.statusCode === 401, 'NoSQL injection em req.user.id deve ser rejeitado');

  // =========================================================================
  // REGRESSÃO 7: IDEM-01 — Deduplicação de Leituras via X-Idempotency-Key
  // =========================================================================
  console.log('\n--- [REGRESSÃO IDEM-01] Idempotência com X-Idempotency-Key ---');
  const mockReqIdem = {
    user: { id: 'usr_test_idem_100' },
    headers: { 'x-idempotency-key': 'key_unique_test_999' },
    body: { glucoseMgDl: 125, trend: '➡️ Estável' }
  };
  const mockResFirst = createMockRes();
  await logGlucoseReadingHandler(mockReqIdem, mockResFirst);
  assert(mockResFirst.statusCode === 201, 'Primeira requisição deve retornar HTTP 201 Created');

  const mockResRetry = createMockRes();
  await logGlucoseReadingHandler(mockReqIdem, mockResRetry);
  assert(mockResRetry.statusCode === 200, 'Retry com mesma chave deve retornar HTTP 200 OK');
  assert(mockResRetry.jsonData && mockResRetry.jsonData.idempotent === true, 'Resposta deve conter flag idempotent: true');

  // =========================================================================
  // REGRESSÃO 8: RT-05 — Retorno HTTP 409 em Conflito de Cadastro
  // =========================================================================
  console.log('\n--- [REGRESSÃO RT-05] Retorno 409 em Cadastro Duplicado ---');
  const mockReqRegisterDup = {
    body: { name: 'Demo Test', email: 'paciente@leben.com', password: 'senha123', diabetesType: 'TYPE_1' }
  };
  const mockResDup = createMockRes();
  await registerHandler(mockReqRegisterDup, mockResDup);
  assert(mockResDup.statusCode === 409, 'Cadastro com e-mail já existente no cache/DB deve retornar HTTP 409');

  console.log('\n======================================================');
  console.log(`📊 RESULTADO DA SUÍTE DE REGRESSÃO (FASE 6):`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`🎯 Total de Testes de Regressão: ${passed + failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegressionSuite();
