/**
 * Motor de Cálculo de Insulina Ativa (IOB — Insulin On Board)
 * Padrão: ES Modules (ESM)
 */

export function calculateIOBFraction(timeElapsedMinutes, diaHours = 4.0) {
  if (timeElapsedMinutes <= 0) return 1.0;

  const diaMinutes = diaHours * 60;
  if (timeElapsedMinutes >= diaMinutes) return 0.0;

  // Curva de decaimento de IOB baseada em aproximação polinomial de 4º grau validada
  const t = timeElapsedMinutes / diaMinutes;
  const iobFraction = 1 - (3.75 * Math.pow(t, 2)) + (4.25 * Math.pow(t, 3)) - (1.5 * Math.pow(t, 4));

  return Math.max(0, Math.min(1, iobFraction));
}

export function calculateRemainingIOB(doseDrawn, timeElapsedMinutes, diaHours = 4.0) {
  const fraction = calculateIOBFraction(timeElapsedMinutes, diaHours);
  return Number((doseDrawn * fraction).toFixed(2));
}
