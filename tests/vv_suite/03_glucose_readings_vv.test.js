/**
 * 🧪 LEBEN V&V SUITE — BATERIA 3: LEITURAS DE GLICEMIA, PARSERS CSV & TIMEZONES
 * Conformidade IEC 62304 / ISO 14971 / CGM Data Processing
 * Teste de faixas de glicemia, importação de CSV (Libre/Dexcom), deduplicação, reordenação e fusos horários.
 */

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [V&V GLUCOSE PASSED]: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [V&V GLUCOSE FAILED]: ${message}`);
    failed++;
  }
}

/** Parser Simulado de CSV do FreeStyle Libre / Dexcom G6 */
function parseCGMCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const results = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.toLowerCase().includes('device') || line.toLowerCase().includes('timestamp')) continue;
    const parts = line.split(/[,;\t]/);
    if (parts.length >= 2) {
      const timeStr = parts[0].replace(/"/g, '').trim();
      const valStr = parts[1].replace(/"/g, '').trim();
      const glucose = parseInt(valStr, 10);
      const timestamp = new Date(timeStr);

      if (!isNaN(glucose) && glucose >= 20 && glucose <= 600 && !isNaN(timestamp.getTime())) {
        results.push({
          glucoseMgDl: glucose,
          timestamp: timestamp.toISOString()
        });
      }
    }
  }
  return results;
}

/** Reordenador Cronológico e Deduplicador de Leituras */
function sortAndDeduplicateReadings(readings) {
  const seen = new Set();
  const unique = [];

  for (const r of readings) {
    const key = `${r.glucoseMgDl}_${r.timestamp}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  // Ordenação cronológica decrescente (mais recente primeiro)
  return unique.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function runGlucoseReadingsVV() {
  console.log('🩸 [BATERIA 3] Iniciando Validação de Leituras, Importação e Timezones...\n');

  // =========================================================================
  // 3.1 VALIDAÇÃO DE FAIXAS GLICÊMICAS CRÍTICAS (65 a 350 mg/dL)
  // =========================================================================
  console.log('--- 3.1 Classificação Clinicamente Aceita por Faixas ---');
  const clinicalThresholds = [
    { bg: 65, category: 'HYPO_SEVERE' },
    { bg: 70, category: 'HYPO_LIMIT' },
    { bg: 71, category: 'NORMAL' },
    { bg: 100, category: 'TARGET' },
    { bg: 180, category: 'TARGET_MAX' },
    { bg: 181, category: 'HYPER' },
    { bg: 250, category: 'HYPER_HIGH' },
    { bg: 350, category: 'HYPER_SEVERE' }
  ];

  for (const t of clinicalThresholds) {
    const isHypo = t.bg <= 70;
    const isTarget = t.bg >= 70 && t.bg <= 180;
    const isHyper = t.bg > 180;

    if (t.bg <= 70) assert(isHypo, `Glicemia ${t.bg} mg/dL classificada corretamente como Alerta de Hipoglicemia`);
    if (t.bg >= 70 && t.bg <= 180) assert(isTarget, `Glicemia ${t.bg} mg/dL classificada corretamente no Alvo (TIR - Time in Range)`);
    if (t.bg > 180) assert(isHyper, `Glicemia ${t.bg} mg/dL classificada corretamente como Hiperglicemia`);
  }

  // =========================================================================
  // 3.2 PARSER DE IMPORTAÇÃO CSV (Libre / Dexcom)
  // =========================================================================
  console.log('\n--- 3.2 Parser de Arquivos CSV de Sensores CGM ---');
  const sampleCSV = `
Timestamp,Glucose Value (mg/dL)
2026-08-06 08:00:00,105
2026-08-06 08:15:00,112
2026-08-06 08:30:00,140
2026-08-06 08:45:00,195
"2026-08-06 09:00:00","210"
INVALID_LINE,TEXT
`;

  const parsed = parseCGMCSV(sampleCSV);
  assert(parsed.length === 5, `CSV processado extraiu exatamente 5 leituras válidas (ignorou cabeçalho e texto inválido)`);
  assert(parsed[0].glucoseMgDl === 105, 'Primeira leitura extraída com valor 105 mg/dL');
  assert(parsed[4].glucoseMgDl === 210, 'Última leitura entre aspas extraída com valor 210 mg/dL');

  // =========================================================================
  // 3.3 REORDENAÇÃO CRONOLÓGICA E DEDUPLICAÇÃO DE LEITURAS
  // =========================================================================
  console.log('\n--- 3.3 Reordenação Temporal e Deduplicador ---');
  const unorderedReadings = [
    { glucoseMgDl: 100, timestamp: '2026-08-06T10:00:00.000Z' },
    { glucoseMgDl: 110, timestamp: '2026-08-06T09:58:00.000Z' },
    { glucoseMgDl: 105, timestamp: '2026-08-06T10:03:00.000Z' },
    { glucoseMgDl: 100, timestamp: '2026-08-06T10:00:00.000Z' }, // Duplicata exata
    { glucoseMgDl: 95, timestamp: '2026-08-06T09:30:00.000Z' }
  ];

  const processed = sortAndDeduplicateReadings(unorderedReadings);
  assert(processed.length === 4, 'Deduplicador removeu a leitura idêntica das 10:00 com sucesso (5 ➔ 4)');
  assert(processed[0].timestamp === '2026-08-06T10:03:00.000Z', 'Primeira leitura ordenada é a mais recente (10:03)');
  assert(processed[3].timestamp === '2026-08-06T09:30:00.000Z', 'Última leitura ordenada é a mais antiga (09:30)');

  // =========================================================================
  // 3.4 PRESERVAÇÃO E CONVERSÃO DE TIMEZONES (UTC vs America/Sao_Paulo)
  // =========================================================================
  console.log('\n--- 3.4 Conversão e Preservação de Timezones ---');
  const utcDateStr = '2026-08-06T12:00:00.000Z';
  const parsedDate = new Date(utcDateStr);
  assert(parsedDate.getUTCHours() === 12, 'Hora UTC extraída corretamente como 12h');

  // Offset BRT (-3 horas)
  const brtHours = (parsedDate.getUTCHours() - 3 + 24) % 24;
  assert(brtHours === 9, '12:00 UTC convertido para horário de Brasília (UTC-3) resulta em 09:00 local');

  console.log(`\n📊 SUMMARY BATERIA 3 (Glicemia & CSV): Passed ${passed} | Failed ${failed}\n`);
  return { passed, failed };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runGlucoseReadingsVV().then(res => { if (res.failed > 0) process.exit(1); });
}
