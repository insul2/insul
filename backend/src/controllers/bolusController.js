import { GlucoseEngineService } from '../services/glucoseEngineService.js';

export function calculateBolusHandler(req, res) {
  try {
    const input = req.body || {};
    const result = GlucoseEngineService.processBolusCalculation(input);

    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Validação de segurança do cálculo falhou.',
        errors: result.validation.errors
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('❌ Controller Bolus Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao processar o cálculo do bolus.',
      error: error.message
    });
  }
}
