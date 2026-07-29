/**
 * Serviço desacoplado para integração com o Motor Clínico de Glicemia e Bolus
 */

import { calculateBolus } from '../core/glucose_engine/insulin_math/bolus.js';

export class GlucoseEngineService {
  static processBolusCalculation(params) {
    return calculateBolus(params);
  }
}
