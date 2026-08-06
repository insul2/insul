/**
 * 🧪 LEBEN CLINICAL ENGINE — TESTES DE INTEGRAÇÃO DE API (FASE 6)
 * Validação de rotas HTTP Express, middlewares de erro e contratos REST.
 */

import { calculateBolusHandler } from '../backend/src/controllers/bolusController.js';
import { loginHandler, refreshTokenHandler } from '../backend/src/controllers/authController.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [INTEGRAÇÃO PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`❌ [INTEGRAÇÃO FAILED]: ${message}`);
    failed++;
  }
}

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

async function runApiIntegrationTests() {
  console.log('🌐 INICIANDO SUÍTE DE TESTES DE INTEGRAÇÃO DE API (FASE 6)\n');

  // 1. Controller /bolus/calculate com payload válido
  console.log('--- Endpoint POST /api/v1/bolus/calculate ---');
  const reqBolusValido = {
    body: {
      glucose: 180,
      carbs: 45,
      iob: 1.0,
      icr: 10,
      isf: 40,
      patientProfile: 'ADULT'
    }
  };
  const resBolusValido = createMockRes();
  calculateBolusHandler(reqBolusValido, resBolusValido);
  assert(resBolusValido.statusCode === 200, 'POST /bolus/calculate com payload válido deve retornar HTTP 200');
  assert(resBolusValido.jsonData.status === 'success', 'Response status deve ser success');
  assert(resBolusValido.jsonData.data.recommendedDose > 0, 'Dose calculada deve ser maior que 0');

  // 2. Controller /bolus/calculate com payload inválido (glicemia < 20)
  const reqBolusInvalido = {
    body: {
      glucose: 10,
      carbs: 45,
      icr: 10,
      isf: 40
    }
  };
  const resBolusInvalido = createMockRes();
  calculateBolusHandler(reqBolusInvalido, resBolusInvalido);
  assert(resBolusInvalido.statusCode === 400, 'POST /bolus/calculate com BG 10 mg/dL deve retornar HTTP 400');
  assert(resBolusInvalido.jsonData.status === 'error', 'Response status deve ser error');

  // 3. Endpoint POST /api/v1/auth/login com credenciais demo
  console.log('\n--- Endpoint POST /api/v1/auth/login ---');
  const reqLogin = {
    body: {
      email: 'paciente@leben.com',
      password: 'senha123'
    }
  };
  const resLogin = createMockRes();
  await loginHandler(reqLogin, resLogin);
  assert(resLogin.statusCode === 200, 'Login demo com credenciais válidas deve retornar HTTP 200');
  assert(typeof resLogin.jsonData.token === 'string', 'Token JWT de acesso deve ser emitido');
  assert(typeof resLogin.jsonData.refreshToken === 'string', 'Refresh Token deve ser emitido');

  // 4. Login com senha errada
  const reqLoginBad = {
    body: {
      email: 'paciente@leben.com',
      password: 'senha_errada_123'
    }
  };
  const resLoginBad = createMockRes();
  await loginHandler(reqLoginBad, resLoginBad);
  assert(resLoginBad.statusCode === 401, 'Login com senha incorreta deve retornar HTTP 401');

  // 5. Refresh Token sem token
  console.log('\n--- Endpoint POST /api/v1/auth/refresh ---');
  const reqRefreshEmpty = { body: {} };
  const resRefreshEmpty = createMockRes();
  await refreshTokenHandler(reqRefreshEmpty, resRefreshEmpty);
  assert(resRefreshEmpty.statusCode === 400, 'Refresh token vazio deve retornar HTTP 400');

  console.log('\n======================================================');
  console.log(`📊 RESULTADO DOS TESTES DE INTEGRAÇÃO (FASE 6):`);
  console.log(`✅ Passaram: ${passed}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`🎯 Total de Testes de Integração: ${passed + failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApiIntegrationTests();
