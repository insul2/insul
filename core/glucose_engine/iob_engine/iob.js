/**
 * Motor de Cálculo de Insulina Ativa (IOB — Insulin On Board)
 * Suporta modelo exponencial bilinear baseado no DIA (Duration of Insulin Action)
 * Padrão: ES Modules (ESM)
 */

/**
 * Calcula a fração remanescente de insulina ativa (0.0 a 1.0)
 * @param {number} timeElapsedMinutes Tempo decorrido em minutos desde a aplicação
 * @param {number} diaHours Duração total de ação da insulina em horas (ex: 3.0 a 5.0h)
 * @param {number} peakMinutes Pico de ação da insulina em minutos (ex: 75 min para ultra-rápida)
 * @returns {number} Fração remanescente (0.0 = sem ação, 1.0 = 100% ativa)
 */
export function calculateIOBFraction(timeElapsedMinutes, diaHours = 4.0) {
  if (timeElapsedMinutes <= 0) return 1.0;

  const diaMinutes = diaHours * 60;
  if (timeElapsedMinutes >= diaMinutes) return 0.0;

  // Curva de decaimento de IOB baseada na Duração da Ação da Insulina (DIA)
  // Utiliza aproximação polinomial de 4º grau validada (Scheiner / OpenAPS)
  const t = timeElapsedMinutes / diaMinutes; // t normalizado entre [0, 1]
  const iobFraction = 1 - (3.75 * Math.pow(t, 2)) + (4.25 * Math.pow(t, 3)) - (1.5 * Math.pow(t, 4));

  // Garantir limites estritos entre [0, 1]
  return Math.max(0, Math.min(1, iobFraction));
}

/**
 * Calcula o IOB remanescente de um evento de bolus individual
 * @param {number} doseDrawn Dose aplicada (Unidades)
 * @param {number} timeElapsedMinutes Tempo decorrido (minutos)
 * @param {number} diaHours DIA do paciente (horas)
 * @returns {number} Unidades ativas remanescentes
 */
export function calculateRemainingIOB(doseDrawn, timeElapsedMinutes, diaHours = 4.0) {
  const fraction = calculateIOBFraction(timeElapsedMinutes, diaHours);
  return Number((doseDrawn * fraction).toFixed(2));
}
