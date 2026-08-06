/**
 * leben-settings.js — Utilitário de persistência de configurações no localStorage.
 * Garante que Settings → Bolus Calculator usem a mesma chave e estrutura.
 */

const SETTINGS_KEY = 'leben_settings';
const PROFILES_KEY = 'leben_settings_profiles';

const DEFAULT_PROFILES = [
  { name: '🌅 Café da Manhã', start: '06:00', startHour: 6, endHour: 11, icr: 9, isf: 32 },
  { name: '☀️ Almoço / Tarde', start: '12:00', startHour: 12, endHour: 17, icr: 13, isf: 42 },
  { name: '🌙 Jantar', start: '18:00', startHour: 18, endHour: 23, icr: 11, isf: 38 },
  { name: '🌌 Madrugada', start: '00:00', startHour: 0, endHour: 5, icr: 17, isf: 55 },
];

const DEFAULT_SETTINGS = {
  target: 100,
  diaHours: 4.0,
  insulinType: 'HUMALOG',
  roundingStep: 0.5,
  patientProfile: 'ADULT',
};

/** Carrega os perfis circadianos salvos. Retorna padrões se não houver nenhum. */
export function loadProfiles() {
  try {
    const saved = localStorage.getItem(PROFILES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return DEFAULT_PROFILES;
}

/** Salva os perfis circadianos. */
export function saveProfiles(profiles) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/** Carrega as configurações globais. */
export function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (_) {}
  return { ...DEFAULT_SETTINGS };
}

/** Salva as configurações globais. */
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** Detecta o perfil circadiano ativo pela hora atual. */
export function getActiveProfile(profiles) {
  const hour = new Date().getHours();
  return profiles.find(p => hour >= p.startHour && hour <= p.endHour) || profiles[1];
}
