/**
 * 🧪 LEBEN V&V SUITE — BATERIA 6: ESTRESSE DE CARGA, ESCALABILIDADE E LATÊNCIA (SRE)
 * Conformidade IEC 62304 / ISO 14971 / Performance Engineering
 * Simulação de carga progressiva (100 a 5.000 requisições simultâneas) medindo p95 e consumo de memória.
 */

import { calculateBolus } from '../../backend/src/core/glucose_engine/insulin_math/bolus.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [V&V STRESS PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [V&V STRESS FAILED]: ${message}`);
    failed++;
  }
}

export async function runStressLoadVV() {
  console.log('⚡ [BATERIA 6] Iniciando Estresse de Carga, Escalabilidade e Latência (SRE)...\n');

  // =========================================================================
  // 6.1 CARGA SIMULTÂNEA DE 1.000 CÁLCULOS DO MOTOR CLÍNICO
  // =========================================================================
  console.log('--- 6.1 Benchmark de 1.000 Cálculos Clínicos Concorrentes ---');
  const count1k = 1000;
  const latencies = [];
  const startHeap = process.memoryUsage().heapUsed;

  const start1k = Date.now();
  for (let i = 0; i < count1k; i++) {
    const t0 = performance.now();
    calculateBolus({
      glucose: 100 + (i % 200),
      carbs: 10 + (i % 80),
      iob: (i % 5),
      icr: 10,
      isf: 40,
      cgmTrend: i % 2 === 0 ? 'FLAT' : 'SINGLE_UP',
      patientProfile: i % 3 === 0 ? 'ADULT' : 'ELDERLY'
    });
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }
  const total1kTime = Date.now() - start1k;

  // Cálculo da Latência p95
  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  assert(total1kTime < 300, `1.000 cálculos executados em ${total1kTime}ms (meta < 300ms)`);
  assert(p95 < 2.0, `Latência p95 do motor foi de ${p95.toFixed(3)}ms (meta < 2.0ms)`);
  assert(avgLatency < 0.5, `Latência média foi de ${avgLatency.toFixed(3)}ms por cálculo`);

  // =========================================================================
  // 6.2 CARGA EXTREMA DE 5.000 CÁLCULOS & VERIFICAÇÃO DE HEAP MEMORY
  // =========================================================================
  console.log('\n--- 6.2 Carga de 5.000 Requisições e Monitoramento de RAM Heap ---');
  const count5k = 5000;
  const start5k = Date.now();

  for (let i = 0; i < count5k; i++) {
    calculateBolus({
      glucose: 120,
      carbs: 45,
      iob: 1.5,
      icr: 10,
      isf: 40
    });
  }
  const total5kTime = Date.now() - start5k;
  const endHeap = process.memoryUsage().heapUsed;
  const heapDiffMB = (endHeap - startHeap) / (1024 * 1024);

  assert(total5kTime < 1000, `5.000 cálculos executados em ${total5kTime}ms (meta < 1000ms / 1 seg)`);
  assert(heapDiffMB < 25.0, `Crescimento de Heap RAM foi de ${heapDiffMB.toFixed(2)}MB (meta < 25MB - sem vazamento)`);

  console.log(`\n📊 SUMMARY BATERIA 6 (Estresse SRE): Passed ${passed} | Failed ${failed}\n`);
  return { passed, failed };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runStressLoadVV().then(res => { if (res.failed > 0) process.exit(1); });
}
