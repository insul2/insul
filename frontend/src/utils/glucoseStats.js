/**
 * glucoseStats.js — Utilitário compartilhado de cálculo de estatísticas clínicas.
 * Fonte única de verdade para TIR, GMI, CV%, TBR, TAR, Min, Max.
 * Usado pelo Dashboard e pelos Relatórios (elimina inconsistência de valores).
 *
 * Fórmulas: ADA / ISPAD / SBD
 */

/**
 * Calcula as estatísticas glicêmicas a partir de um array de valores em mg/dL.
 * @param {number[]} readings - Array de valores numéricos de glicemia
 * @returns {{total:number, mean:number, tir:number, tbr:number, tar:number, cv:number, gmi:number, min:number, max:number}}
 */
export function computeGlucoseStats(readings) {
  if (!readings || readings.length === 0) {
    return { total: 0, mean: 0, tir: 0, tbr: 0, tar: 0, cv: 0, gmi: 0, min: 0, max: 0 };
  }

  const total = readings.length;
  const mean = readings.reduce((a, b) => a + b, 0) / total;
  const sd = Math.sqrt(readings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / total);
  const cv = mean > 0 ? (sd / mean) * 100 : 0;

  // Fórmula oficial ADA/ISPAD para GMI (Glucose Management Indicator ≈ HbA1c estimada)
  // GMI (%) = 3.31 + (0.02392 × média em mg/dL)
  const gmi = 3.31 + (0.02392 * mean);

  const below = readings.filter(x => x < 70).length;
  const inRange = readings.filter(x => x >= 70 && x <= 180).length;
  const above = readings.filter(x => x > 180).length;

  return {
    total,
    mean: Math.round(mean),
    tir: Math.round((inRange / total) * 100),
    tbr: Math.round((below / total) * 100),
    tar: Math.round((above / total) * 100),
    cv: Number(cv.toFixed(1)),
    gmi: Number(gmi.toFixed(1)),
    min: Math.min(...readings),
    max: Math.max(...readings),
  };
}

/**
 * Carrega leituras de glicemia: tenta a API REST primeiro, cai para localStorage.
 * @returns {Promise<number[]>} Array de valores em mg/dL
 */
export async function fetchGlucoseValues() {
  try {
    const token = localStorage.getItem('leben_token');
    const res = await fetch('/api/v1/glucose', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.status === 'success' && json.data && json.data.length > 0) {
      return json.data.map(d => d.glucoseMgDl);
    }
  } catch (_) {}

  const saved = localStorage.getItem('leben_glucose_readings');
  if (saved) {
    const parsed = JSON.parse(saved);
    return parsed.map(r => r.glucoseMgDl);
  }
  return [];
}
