import { GlucoseEngineService } from '../services/glucoseEngineService.js';

export function calculateBolusHandler(req, res) {
  try {
    const rawInput = req.body || {};
    const normalizedInput = {
      ...rawInput,
      glucose: rawInput.glucose ?? rawInput.currentGlucose,
      carbs: rawInput.carbs ?? rawInput.carbsGrams,
      targetGlucose: rawInput.targetGlucose ?? rawInput.target
    };

    const result = GlucoseEngineService.processBolusCalculation(normalizedInput);

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
