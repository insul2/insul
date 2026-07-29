/**
 * Serviço de Integração com Modelos de Inteligência Artificial (Gemini / OpenAI / Claude)
 * Camada abstrata desacoplada de controllers.
 */

export class AIService {
  /**
   * Analisa a foto ou descrição de uma refeição e estima a quantidade de carboidratos
   * @param {Object} input { imageBase64, textDescription }
   */
  static async analyzeMeal(input) {
    // Abstração de integração com o Gemini V2 / OpenAI / Claude
    const mockAnalysis = {
      detectedItems: [
        { name: 'Arroz Branco Cozido', portion: '150g', carbsGrams: 42, confidence: 0.95 },
        { name: 'Feijão Carioca', portion: '100g', carbsGrams: 14, confidence: 0.92 }
      ],
      totalCarbs: 56,
      estimatedFPU: { fatGrams: 8, proteinGrams: 12 },
      recommendation: 'Refeição equilibrada com média carga glicêmica.'
    };

    return mockAnalysis;
  }

  /**
   * Gera insights de hábitos glicêmicos com base nos históricos
   */
  static async generateHabitInsights(patientHistory) {
    return {
      insight: 'Notamos uma tendência de elevação glicêmica recorrente às 22h após refeições ricas em gordura.',
      suggestion: 'Considere conversar com seu médico sobre bolus prolongado para refeições noturnas.'
    };
  }
}
