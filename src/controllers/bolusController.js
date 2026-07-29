/**
 * Controller REST para Cálculo de Bolus de Insulina
 * Endpoint: POST /api/v1/bolus/calculate
 * Padrão: ES Modules (ESM)
 */

import { calculateBolus } from '../../core/glucose_engine/insulin_math/bolus.js';

export function handleCalculateBolus(req, res) {
  try {
    const input = req.body || {};
    
    // Executa o cálculo via motor desacoplado
    const result = calculateBolus(input);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Falha na validação do cálculo de bolus.',
        details: result.validation.errors
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('❌ Erro no processamento do Bolus:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao processar o cálculo do bolus.',
      error: error.message
    });
  }
}
