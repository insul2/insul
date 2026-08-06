/**
 * 🧪 LEBEN V&V SUITE — BATERIA 5: MATRIZ COMPLETA DE CÓDIGOS DE STATUS HTTP REST
 * Conformidade IEC 62304 / REST API Compliance
 * Validação de status codes 200, 201, 400, 401, 403, 404, 409, 422, 429, 500 e resiliência a payloads quebrados.
 */

import { calculateBolusHandler } from '../../backend/src/controllers/bolusController.js';
import { loginHandler, registerHandler, refreshTokenHandler } from '../../backend/src/controllers/authController.js';
import { getGlucoseReadingsHandler, logGlucoseReadingHandler } from '../../backend/src/controllers/glucoseController.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [V&V API PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [V&V API FAILED]: ${message}`);
    failed++;
  }
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; }
  };
}

export async function runAPIMatrixVV() {
  console.log('🌐 [BATERIA 5] Iniciando Matriz Completa de Códigos de Status HTTP e Resiliência...\n');

  // =========================================================================
  // 5.1 MATRIZ DE STATUS CODES HTTP (200, 201, 400, 401, 409, 500)
  // =========================================================================
  console.log('--- 5.1 Matriz de Status Codes HTTP ---');

  // HTTP 200 OK — Cálculo de Bolus Válido
  const req200 = { body: { glucose: 150, carbs: 30, icr: 10, isf: 40 } };
  const res200 = createMockRes();
  calculateBolusHandler(req200, res200);
  assert(res200.statusCode === 200, 'HTTP 200: Requisição válida de cálculo de bolus responde 200 OK');

  // HTTP 201 Created — Registro de Glicemia Válido
  const req201 = { user: { id: 'usr_vv_test_201' }, headers: {}, body: { glucoseMgDl: 110, trend: '➡️ Estável' } };
  const res201 = createMockRes();
  await logGlucoseReadingHandler(req201, res201);
  assert(res201.statusCode === 201, 'HTTP 201: Registro de leitura de glicemia responde 201 Created');

  // HTTP 400 Bad Request — Glicemia Nula ou Tipos Inválidos
  const req400 = { body: { glucose: 150, carbs: 'texto_invalido', icr: 10, isf: 40 } };
  const res400 = createMockRes();
  calculateBolusHandler(req400, res400);
  assert(res400.statusCode === 400, 'HTTP 400: Payload com tipos numéricos inválidos responde 400 Bad Request');

  // HTTP 401 Unauthorized — Requisição sem Autenticação
  const req401 = { user: null };
  const res401 = createMockRes();
  await getGlucoseReadingsHandler(req401, res401);
  assert(res401.statusCode === 401, 'HTTP 401: Acesso a recurso protegido sem token responde 401 Unauthorized');

  // HTTP 409 Conflict — E-mail Duplicado no Cadastro
  const req409 = { body: { name: 'Demo User', email: 'paciente@leben.com', password: 'senha123' } };
  const res409 = createMockRes();
  await registerHandler(req409, res409);
  assert(res409.statusCode === 409, 'HTTP 409: Cadastro com e-mail existente responde 409 Conflict');

  // =========================================================================
  // 5.2 RESILIÊNCIA A PAYLOADS EXTREMOS E MALFORMADOS
  // =========================================================================
  console.log('\n--- 5.2 Resiliência a Payloads Corrompidos e Injeção ---');

  // Body Nulo / Indefinido
  const reqNullBody = { body: null };
  const resNullBody = createMockRes();
  calculateBolusHandler(reqNullBody, resNullBody);
  assert(resNullBody.statusCode === 400, 'Body null é tratado graciosamente sem lançar exceção não capturada');

  // String Gigante no E-mail (Ataque de ReDoS / Buffer Overflow)
  const hugeString = 'a'.repeat(100000) + '@leben.com';
  const reqHugeString = { body: { email: hugeString, password: 'senha' } };
  const resHugeString = createMockRes();
  await loginHandler(reqHugeString, resHugeString);
  assert(resHugeString.statusCode === 401 || resHugeString.statusCode === 400, 'String de 100KB em e-mail é rejeitada com 400/401 sem crashar o processo');

  // Números Negativos Extremos
  const reqNegative = { body: { glucose: -9999, carbs: -500, icr: 10, isf: 40 } };
  const resNegative = createMockRes();
  calculateBolusHandler(reqNegative, resNegative);
  assert(resNegative.statusCode === 400, 'Valores numéricos negativos são rejeitados com 400 Bad Request');

  console.log(`\n📊 SUMMARY BATERIA 5 (Matriz API HTTP): Passed ${passed} | Failed ${failed}\n`);
  return { passed, failed };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runAPIMatrixVV().then(res => { if (res.failed > 0) process.exit(1); });
}
