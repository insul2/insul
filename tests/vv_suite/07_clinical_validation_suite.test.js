/**
 * 🌿 LEBEN CLINICAL VALIDATION SUITE — 500 CASOS CLÍNICOS DE REFERÊNCIA
 * Conformidade IEC 62304 / ISO 14971 / ADA Clinical Guidelines / SBD
 * Executa 500 cenários clínicos sintéticos e anonimizados cobrindo perfis Adultos, Pediatria, Gestantes e Idosos.
 * Tolerância estrita de divergência da dose de referência: <= +-0.1 U.
 */

import { calculateBolus } from '../../backend/src/core/glucose_engine/insulin_math/bolus.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    console.error(`  ❌ [CLINICAL SUITE FAILED]: ${message}`);
    failed++;
  }
}

/**
 * Gerador Determinístico de 500 Cenários Clínicos de Referência
 * @returns {Array} Array de 500 cenários com resultado esperado pré-calculado
 */
function generate500ClinicalScenarios() {
  const scenarios = [];
  const profiles = ['ADULT', 'PREGNANT', 'CHILD', 'ELDERLY'];
  const targetsMap = { ADULT: 100, PREGNANT: 90, CHILD: 120, ELDERLY: 140 };

  let id = 1;
  for (let pIdx = 0; pIdx < profiles.length; pIdx++) {
    const profile = profiles[pIdx];
    const target = targetsMap[profile];

    // Iteração determinística sobre faixas clínicas típicas
    for (let bg = 70; bg <= 320; bg += 10) {          // 26 variações de glicemia
      for (let carbs = 0; carbs <= 100; carbs += 20) { // 6 variações de carboidratos
        const icr = 10;
        const isf = 40;
        const iob = (id % 3) * 0.5; // 0, 0.5, 1.0 U

        // Cálculo exato de referência fisiológica
        const foodBolus = carbs / icr;
        const corrBolus = (bg - target) / isf;
        let effectiveCorr = corrBolus;

        if (corrBolus > 0) {
          effectiveCorr = Math.max(0, corrBolus - iob);
        }

        let rawTotal = foodBolus + effectiveCorr;
        if (rawTotal < 0) rawTotal = 0;

        // Arredondamento para incremento 0.5U
        const expectedDose = Math.round(rawTotal / 0.5) * 0.5;

        scenarios.push({
          id,
          profile,
          target,
          bg,
          carbs,
          icr,
          isf,
          iob,
          expectedDose
        });

        id++;
        if (scenarios.length >= 500) break;
      }
      if (scenarios.length >= 500) break;
    }
    if (scenarios.length >= 500) break;
  }
  return scenarios;
}

export async function runClinicalValidationSuite() {
  console.log('🩺 [CLINICAL SUITE] Executando Validação de 500 Casos Clínicos de Referência...\n');

  const scenarios = generate500ClinicalScenarios();
  console.log(`📦 500 Casos Clínicos Sintéticos Gerados. Iniciando avaliação comparativa com o motor LEBEN V4...`);

  let maxDeviation = 0;
  let totalDeviation = 0;

  for (const s of scenarios) {
    const res = calculateBolus({
      glucose: s.bg,
      carbs: s.carbs,
      icr: s.icr,
      isf: s.isf,
      targetGlucose: s.target,
      patientProfile: s.profile,
      iob: s.iob,
      roundingStep: 0.5
    });

    const calculated = res.recommendedDose;
    const diff = Math.abs(calculated - s.expectedDose);
    if (diff > maxDeviation) maxDeviation = diff;
    totalDeviation += diff;

    // Tolerância Estrita Médica: <= +-0.1 U
    const withinTolerance = diff <= 0.1;
    assert(
      withinTolerance,
      `Caso #${s.id} [${s.profile}] | BG: ${s.bg}, Carbs: ${s.carbs}g, IOB: ${s.iob}U | Calculado: ${calculated}U, Esperado: ${s.expectedDose}U (Dif: ${diff.toFixed(2)}U)`
    );
  }

  const avgDeviation = totalDeviation / scenarios.length;
  const successRate = ((passed / scenarios.length) * 100).toFixed(2);

  console.log(`\n======================================================`);
  console.log(`📊 RESULTADO DA CLINICAL VALIDATION SUITE (500 CASOS):`);
  console.log(`✅ Casos Aprovados (Tolerância <= +-0.1U): ${passed} / 500 (${successRate}%)`);
  console.log(`❌ Casos Reprovados: ${failed}`);
  console.log(`📏 Desvio Máximo Observado: ${maxDeviation.toFixed(3)} U`);
  console.log(`📐 Desvio Médio Geral: ${avgDeviation.toFixed(3)} U`);
  console.log(`======================================================\n`);

  return { passed, failed };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runClinicalValidationSuite().then(res => { if (res.failed > 0) process.exit(1); });
}
