/**
 * Utilitário Clínico para Cálculo Automático de IOB com base no Histórico de Doses LEBEN V4.0
 */

export function getInsulinDIA(type = 'HUMALOG') {
  switch (type) {
    case 'FIASP':
    case 'LUMJEV':
      return 3.0; // Insulinas Super-Ultrarrápidas (3h)
    case 'REGULAR':
      return 6.0; // Insulina Regular (6h)
    case 'HUMALOG':
    case 'NOVORAPID':
    case 'APIDRA':
    default:
      return 4.0; // Insulinas Ultrarrápidas Padrão (4h)
  }
}

function curveHumalog(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  return Math.max(0, 1 - (3.75 * Math.pow(t, 2)) + (4.25 * Math.pow(t, 3)) - (1.5 * Math.pow(t, 4)));
}

function curveFiasp(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  return Math.max(0, 1 - (4.2 * Math.pow(t, 2)) + (4.8 * Math.pow(t, 3)) - (1.6 * Math.pow(t, 4)));
}

function curveRegular(t) {
  if (t <= 0) return 1.0;
  if (t >= 1.0) return 0.0;
  return Math.max(0, 1 - (3.0 * Math.pow(t, 2)) + (3.2 * Math.pow(t, 3)) - (1.2 * Math.pow(t, 4)));
}

export function calculateIOBFraction(timeElapsedMinutes, insulinType = 'HUMALOG') {
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

  if (timeElapsedMinutes <= 0) return 1.0;
  const diaMinutes = diaHours * 60;
  if (timeElapsedMinutes >= diaMinutes) return 0.0;

  const t = timeElapsedMinutes / diaMinutes;
  return Math.max(0, Math.min(1, curveFn(t)));
}

export function computeAutoIOB(history = [], insulinType = 'HUMALOG') {
  const diaHours = getInsulinDIA(insulinType);
  const now = new Date();

  let totalIOB = 0;
  const activeDoses = [];

  history.forEach((item) => {
    if (!item.timestamp || !item.dose) return;

    const appliedTime = new Date(item.timestamp);
    const elapsedMinutes = (now - appliedTime) / (1000 * 60);

    if (elapsedMinutes >= 0 && elapsedMinutes < diaHours * 60) {
      const fraction = calculateIOBFraction(elapsedMinutes, insulinType);
      const remainingIOB = Number((item.dose * fraction).toFixed(2));

      if (remainingIOB > 0) {
        totalIOB += remainingIOB;
        activeDoses.push({
          ...item,
          elapsedMinutes: Math.round(elapsedMinutes),
          remainingIOB
        });
      }
    }
  });

  return {
    totalIOB: Number(totalIOB.toFixed(2)),
    activeDoses,
    diaHours
  };
}
