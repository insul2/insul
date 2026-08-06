/**
 * 🌿 Motor de Cálculo de Insulina Ativa (IOB — Insulin On Board)
 * Padrão: ES Modules (ESM) — Curvas Específicas de Farmacocinética
 */

// Curva Específica para Insulinas Ultrarrápidas Padrão (Humalog / Novorapid / Apidra - DIA 4h)
function curveHumalog(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  return Math.max(0, 1 - (3.75 * Math.pow(t, 2)) + (4.25 * Math.pow(t, 3)) - (1.5 * Math.pow(t, 4)));
}

// Curva Específica para Insulinas Super-Ultrarrápidas (Fiasp / Lumjev - Pico Precoce - DIA 3h)
function curveFiasp(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  // Pico de absorção acelerado nos primeiros 45min
  return Math.max(0, 1 - (4.2 * Math.pow(t, 2)) + (4.8 * Math.pow(t, 3)) - (1.6 * Math.pow(t, 4)));
}

// Curva Específica para Insulina Humana Regular (DIA 6h)
function curveRegular(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  return Math.max(0, 1 - (3.0 * Math.pow(t, 2)) + (3.2 * Math.pow(t, 3)) - (1.2 * Math.pow(t, 4)));
}

export function calculateIOBFraction(timeElapsedMinutes, insulinType = 'HUMALOG', customDiaHours = null) {
  const type = (insulinType || 'HUMALOG').toUpperCase();
  let diaHours = 4.0;
  let curveFn = curveHumalog;

  if (type === 'FIASP' || type === 'LUMJEV') {
    diaHours = 3.0;
    curveFn = curveFiasp;
  } else if (type === 'REGULAR') {
    diaHours = 6.0;
    curveFn = curveRegular;
  }

  // CROSS-03: Se um DIA personalizado do paciente foi fornecido, sobrepõe o padrão do tipo.
  // Isso garante que Patient.diaHours do banco de dados seja efetivamente usado no cálculo.
  const effectiveDiaHours = (customDiaHours && customDiaHours > 0) ? customDiaHours : diaHours;

  if (timeElapsedMinutes <= 0) return 1.0;
  const diaMinutes = effectiveDiaHours * 60;
  if (timeElapsedMinutes >= diaMinutes) return 0.0;

  const t = timeElapsedMinutes / diaMinutes;
  return Math.max(0, Math.min(1, curveFn(t)));
}

export function calculateRemainingIOB(doseDrawn, timeElapsedMinutes, insulinType = 'HUMALOG', customDiaHours = null) {
  const fraction = calculateIOBFraction(timeElapsedMinutes, insulinType, customDiaHours);
  return Number((doseDrawn * fraction).toFixed(2));
}
