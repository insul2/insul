/**
 * Utilitário Clínico para Cálculo Automático de IOB com base no Histórico de Doses
 */

export function getInsulinDIA(type = 'HUMALOG') {
  switch (type) {
    case 'FIASP':
    case 'LUMJEV':
      return 3.0; // Insulinas Ultra-Ultrarrápidas (3h)
    case 'REGULAR':
      return 6.0; // Insulina Regular (6h)
    case 'HUMALOG':
    case 'NOVORAPID':
    case 'APIDRA':
    default:
      return 4.0; // Insulinas Ultrarrápidas Padrão (4h)
  }
}

export function calculateIOBFraction(timeElapsedMinutes, diaHours = 4.0) {
  if (timeElapsedMinutes <= 0) return 1.0;

  const diaMinutes = diaHours * 60;
  if (timeElapsedMinutes >= diaMinutes) return 0.0;

  const t = timeElapsedMinutes / diaMinutes;
  const iobFraction = 1 - (3.75 * Math.pow(t, 2)) + (4.25 * Math.pow(t, 3)) - (1.5 * Math.pow(t, 4));

  return Math.max(0, Math.min(1, iobFraction));
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
      const fraction = calculateIOBFraction(elapsedMinutes, diaHours);
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
    totalIOB: Number(totalIOB.toFixed(1)),
    diaHours,
    activeDoses
  };
}
