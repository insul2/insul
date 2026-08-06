/**
 * 🧪 LEBEN V&V SUITE — BATERIA 1: VALIDAÇÃO MATEMÁTICA DO MOTOR CLÍNICO
 * Conformidade IEC 62304 / ISO 14971 / ADA / SBD
 * Teste combinatório completo: Bolus, IOB, Exercícios, CGM Trends, Condições Clínicas, Perfis e Extremos.
 */

import { calculateBolus, CGM_TREND_MODIFIERS, EXERCISE_MODIFIERS, CLINICAL_CONDITIONS } from '../../backend/src/core/glucose_engine/insulin_math/bolus.js';
import { calculateIOBFraction, calculateRemainingIOB } from '../../backend/src/core/glucose_engine/iob_engine/iob.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [V&V MATH PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [V&V MATH FAILED]: ${message}`);
    failed++;
  }
}

export async function runClinicalMathVV() {
  console.log('📐 [BATERIA 1] Iniciando Validação Matemática do Motor Clínico...\n');

  // =========================================================================
  // 1.1 MATRIZ DE MATEMÁTICA DE BOLUS (Tabela de Combinações de Referência)
  // =========================================================================
  console.log('--- 1.1 Matriz de Cálculo de Bolus de Referência ---');
  const referenceScenarios = [
    { bg: 100, carbs: 30, icr: 10, isf: 50, target: 100, iob: 0, expected: 3.0, label: 'BG no alvo, apenas comida (30g/10 = 3.0U)' },
    { bg: 150, carbs: 30, icr: 10, isf: 50, target: 100, iob: 0, expected: 4.0, label: 'BG 150, 30g carbo (3.0U comida + 1.0U correção = 4.0U)' },
    { bg: 200, carbs: 30, icr: 10, isf: 50, target: 100, iob: 0, expected: 5.0, label: 'BG 200, 30g carbo (3.0U comida + 2.0U correção = 5.0U)' },
    { bg: 300, carbs: 80, icr: 12, isf: 40, target: 120, iob: 0, expected: 11.0, label: 'BG 300, 80g carbo, Alvo 120 (6.67U + 4.5U = 11.17 ➔ 11.0U)' },
    { bg: 80, carbs: 40, icr: 10, isf: 50, target: 100, iob: 0, expected: 4.0, label: 'BG 80 mg/dL (normal baixo) ➔ Sem correção negativa na comida = 4.0U' },
    { bg: 65, carbs: 50, icr: 10, isf: 50, target: 100, iob: 0, expected: 0.0, label: 'BG 65 mg/dL (hipoglicemia) ➔ Trava de segurança zera a dose = 0.0U' }
  ];

  for (const s of referenceScenarios) {
    const res = calculateBolus({ glucose: s.bg, carbs: s.carbs, icr: s.icr, isf: s.isf, targetGlucose: s.target, iob: s.iob });
    const diff = Math.abs(res.recommendedDose - s.expected);
    assert(diff <= 0.5, `${s.label} | Obteve: ${res.recommendedDose}U, Esperado: ~${s.expected}U`);
  }

  // =========================================================================
  // 1.2 VALIDAÇÃO DA CURVA DE IOB EM TODAS AS INSULINAS (t = 0 a 300 min)
  // =========================================================================
  console.log('\n--- 1.2 Curva de Decaimento IOB (Wilinska Model) ---');
  const insulins = ['HUMALOG', 'FIASP', 'REGULAR'];
  const timePoints = [0, 30, 60, 120, 180, 240, 300];

  for (const ins of insulins) {
    let lastFraction = 1.05;
    for (const t of timePoints) {
      const frac = calculateIOBFraction(t, ins);
      assert(frac >= 0 && frac <= 1.0, `${ins} t=${t}min IOB fraction (${frac.toFixed(3)}) deve estar entre 0.0 e 1.0`);
      assert(frac <= lastFraction, `${ins} decaimento em t=${t}min deve ser estritamente não-crescente (${frac.toFixed(3)} <= ${lastFraction.toFixed(3)})`);
      lastFraction = frac;
    }
  }

  // Confirmação de esgotamento total da dose de acordo com o DIA da insulina
  assert(calculateIOBFraction(240, 'HUMALOG') === 0.0, 'Humalog (DIA 4h) em 240min deve ser 0% IOB');
  assert(calculateIOBFraction(180, 'FIASP') === 0.0, 'Fiasp (DIA 3h) em 180min deve ser 0% IOB');
  assert(calculateIOBFraction(360, 'REGULAR') === 0.0, 'Regular (DIA 6h) em 360min deve ser 0% IOB');

  // =========================================================================
  // 1.3 MODIFICADORES DE EXERCÍCIO FÍSICO
  // =========================================================================
  console.log('\n--- 1.3 Modificadores Fisiológicos de Exercício Físico ---');
  const baseDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, exercise: 'NONE' }).recommendedDose;

  const walkDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, exercise: 'WALK_30' }).recommendedDose;
  const runDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, exercise: 'RUN_30' }).recommendedDose;
  const intenseDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, exercise: 'INTENSE_60' }).recommendedDose;
  const anaerobicDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, exercise: 'RESISTANCE_ANAEROBIC' }).recommendedDose;

  assert(walkDose < baseDose, `Caminhada (${walkDose}U) deve reduzir dose em relação à base (${baseDose}U)`);
  assert(runDose < walkDose, `Corrida (${runDose}U) deve reduzir mais que caminhada (${walkDose}U)`);
  assert(intenseDose < runDose, `Treino Intenso (${intenseDose}U) deve dar o maior desconto aeróbico (${runDose}U)`);
  assert(anaerobicDose > baseDose, `Musculação/Anaeróbico (${anaerobicDose}U) deve AUMENTAR a dose devido ao pico hiperglicêmico hormonal`);

  // =========================================================================
  // 1.4 MODIFICADORES DE TENDÊNCIA CGM
  // =========================================================================
  console.log('\n--- 1.4 Modificadores de Tendência CGM (mg/dL/min) ---');
  const bgBase = 150;
  const trendDoubleUp = calculateBolus({ glucose: bgBase, carbs: 0, icr: 10, isf: 50, cgmTrend: 'DOUBLE_UP' }).recommendedDose;
  const trendFlat = calculateBolus({ glucose: bgBase, carbs: 0, icr: 10, isf: 50, cgmTrend: 'FLAT' }).recommendedDose;
  const trendDoubleDown = calculateBolus({ glucose: bgBase, carbs: 0, icr: 10, isf: 50, cgmTrend: 'DOUBLE_DOWN' }).recommendedDose;

  assert(trendDoubleUp > trendFlat, `DOUBLE_UP (${trendDoubleUp}U) deve aumentar a dose de correção contra FLAT (${trendFlat}U)`);
  assert(trendDoubleDown < trendFlat, `DOUBLE_DOWN (${trendDoubleDown}U) deve reduzir a dose de correção contra FLAT (${trendFlat}U)`);

  // =========================================================================
  // 1.5 CONDIÇÕES CLÍNICAS ESPECIAIS (Febre, Estresse, Corticoides)
  // =========================================================================
  console.log('\n--- 1.5 Condições Clínicas Especiais ---');
  const feverDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, condition: 'FEVER_ILLNESS' }).recommendedDose;
  const steroidsDose = calculateBolus({ glucose: 150, carbs: 40, icr: 10, isf: 40, condition: 'STEROIDS' }).recommendedDose;

  assert(feverDose > baseDose, `Febre (${feverDose}U) deve aumentar a dose em +20% devido ao cortisol/resistência`);
  assert(steroidsDose > feverDose, `Uso de Corticoides (${steroidsDose}U) deve aumentar mais a dose que febre (+30%)`);

  // =========================================================================
  // 1.6 PERFIS DE PACIENTES (Metas de Glicemia Alvo)
  // =========================================================================
  console.log('\n--- 1.6 Perfis de Pacientes e Metas Alvo ---');
  const adultDose = calculateBolus({ glucose: 200, carbs: 0, icr: 10, isf: 40, patientProfile: 'ADULT', roundingStep: 0.1 }).recommendedDose;     // Target 100 ➔ 2.5U
  const pregnantDose = calculateBolus({ glucose: 200, carbs: 0, icr: 10, isf: 40, patientProfile: 'PREGNANT', roundingStep: 0.1 }).recommendedDose; // Target 90  ➔ 2.75U ➔ 2.8U
  const childDose = calculateBolus({ glucose: 200, carbs: 0, icr: 10, isf: 40, patientProfile: 'CHILD', roundingStep: 0.1 }).recommendedDose;       // Target 120 ➔ 2.0U
  const elderlyDose = calculateBolus({ glucose: 200, carbs: 0, icr: 10, isf: 40, patientProfile: 'ELDERLY', roundingStep: 0.1 }).recommendedDose;   // Target 140 ➔ 1.5U

  assert(pregnantDose > adultDose, `Gestante (alvo 90, dose ${pregnantDose}U) deve ter maior correção que Adulto (${adultDose}U)`);
  assert(childDose < adultDose, `Pediatria (alvo 120, dose ${childDose}U) deve ter menor correção que Adulto (${adultDose}U)`);
  assert(elderlyDose < childDose, `Idoso (alvo 140, dose ${elderlyDose}U) deve ter a menor correção preventiva (${childDose}U)`);

  // =========================================================================
  // 1.7 VALORES EXTREMOS DE GLICEMIA (20 a 600 mg/dL)
  // =========================================================================
  console.log('\n--- 1.7 Faixa de Valores Extremos de Glicemia ---');
  const extremeBgs = [20, 25, 30, 40, 50, 70, 100, 180, 250, 350, 500, 600];
  for (const bg of extremeBgs) {
    const res = calculateBolus({ glucose: bg, carbs: 30, icr: 10, isf: 40 });
    assert(typeof res.recommendedDose === 'number' && !isNaN(res.recommendedDose), `BG ${bg} mg/dL produziu resposta numérica válida (${res.recommendedDose}U)`);
    if (bg < 70) {
      assert(res.recommendedDose === 0, `BG ${bg} mg/dL (< 70) DEVE ter dose 0U obrigatoriamente por trava clínica`);
    }
  }

  console.log(`\n📊 SUMMARY BATERIA 1 (Matemática): Passed ${passed} | Failed ${failed}\n`);
  return { passed, failed };
}

// Execução direta se chamado como script principal
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runClinicalMathVV().then(res => { if (res.failed > 0) process.exit(1); });
}
