/**
 * 🌿 LEBEN V&V SUITE — MASTER RUNNER (FASE 7)
 * Executa sequencialmente as 7 Baterias de Verification & Validation Médica.
 * Conformidade IEC 62304 / ISO 14971 / FDA / ANVISA
 */

import { runClinicalMathVV } from './01_clinical_math_vv.test.js';
import { runDatabaseVV } from './02_database_vv.test.js';
import { runGlucoseReadingsVV } from './03_glucose_readings_vv.test.js';
import { runNFCLibreParserVV } from './04_nfc_libre_parser_vv.test.js';
import { runAPIMatrixVV } from './05_api_matrix_vv.test.js';
import { runStressLoadVV } from './06_stress_load_vv.test.js';
import { runClinicalValidationSuite } from './07_clinical_validation_suite.test.js';
import { runFase10IntegratedValidation } from './08_integrated_validation_vv.test.js';

async function runMasterVVProtocol() {
  console.log('\n===================================================================');
  console.log('🏥 LEBEN ENGINE V4.0 — MASTER VERIFICATION & VALIDATION (V&V) SUITE');
  console.log('   Padrão Regulatório: IEC 62304 / ISO 14971 / FDA / ANVISA');
  console.log('===================================================================\n');

  let totalPassed = 0;
  let totalFailed = 0;

  const suites = [
    { name: 'Bateria 1: Validação Matemática do Motor', fn: runClinicalMathVV },
    { name: 'Bateria 2: Banco de Dados & Transações', fn: runDatabaseVV },
    { name: 'Bateria 3: Leituras de Glicemia & CSV', fn: runGlucoseReadingsVV },
    { name: 'Bateria 4: Transponder & Parser NFC Libre', fn: runNFCLibreParserVV },
    { name: 'Bateria 5: Matriz de Resiliência HTTP API', fn: runAPIMatrixVV },
    { name: 'Bateria 6: Estresse de Carga & SRE', fn: runStressLoadVV },
    { name: 'Bateria 7: Clinical Validation Suite (500 casos)', fn: runClinicalValidationSuite },
    { name: 'Bateria 8 (Fase 10): Validação Integrada E2E & Confiabilidade', fn: runFase10IntegratedValidation }
  ];

  for (const s of suites) {
    try {
      const res = await s.fn();
      totalPassed += res.passed;
      totalFailed += res.failed;
    } catch (err) {
      console.error(`❌ Erro fatal na suíte ${s.name}:`, err.message);
      totalFailed++;
    }
  }

  console.log('\n===================================================================');
  console.log(`🏆 RESULTADO FINAL DO PROTOCOLO V&V (FASE 7):`);
  console.log(`✅ Total de Asserções Aprovadas: ${totalPassed}`);
  console.log(`❌ Total de Asserções Reprovadas: ${totalFailed}`);
  console.log(`🎯 Taxa de Aprovação V&V: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);
  console.log('===================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runMasterVVProtocol();
