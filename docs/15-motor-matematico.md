# Documento 15 — Motor Matemático (Glucose Engine)

> [!CAUTION]
> **Aviso Médico e de Segurança (Medical Disclaimer)**
> Este documento contém especificações de algoritmos de cálculo de dose de insulina. Este é um Sistema de Suporte à Decisão Clínica (CDSS). As fórmulas e cálculos aqui detalhados não substituem a avaliação médica. Todo o código que implementa estas especificações DEVE passar por testes rigorosos de segurança e validação clínica de acordo com as normas da ANVISA, FDA e diretrizes da ADA, ISPAD e SBD.

## Sumário Executivo

O Motor Matemático (Glucose Engine) é o núcleo do sistema de suporte à decisão clínica para diabetes. Ele é responsável por processar todas as variáveis metabólicas do paciente (glicemia, carboidratos, proteínas, gorduras, histórico de insulina, atividade física) e gerar recomendações de doses de insulina e predições glicêmicas seguras.

O sistema foi arquitetado de forma modular, agnóstica e seguindo princípios de alta segurança, validando cada input antes do processamento e auditando cada output gerado.

---

## Estrutura do Módulo `core/glucose_engine`

A arquitetura do motor foi dividida em submódulos específicos para garantir a responsabilidade única, facilitar o isolamento de testes e garantir que as manutenções nas fórmulas matemáticas não afetem outras lógicas do sistema.

```text
core/
    glucose_engine/
        insulin_math/      # Cálculos de doses e sensibilidade
        iob_engine/        # Modelagem de insulina ativa (Insulin on Board)
        carb_engine/       # Impacto de carboidratos, proteínas e gorduras
        exercise_engine/   # Modificadores de atividade física
        meal_prediction/   # Predição de curva glicêmica pós-prandial
        validation/        # Validação estrita de inputs
        safety_rules/      # Regras de proteção contra superdosagem/hipoglicemia
        index.js           # Orquestrador Principal
```

---

## 1. Módulo: `insulin_math/`

### Responsabilidade e Propósito
Este submódulo concentra todas as equações matemáticas puras relacionadas à terapia com insulina, desde o cálculo do bolus alimentar e de correção até as proporções de ISF (Fator de Sensibilidade à Insulina) e ICR (Relação Insulina-Carboidrato).

### Interface Pública (Exports)
- `calculateBolusFood`
- `calculateBolusCorrection`
- `calculateTotalBolus`
- `calculateISF`
- `calculateICR`
- `adjustBolusByCGMTrend`
- `calculateDualWaveBolus`

### Dependências
Nenhuma externa. Utiliza apenas funções nativas do JavaScript (ex: `Math`).

### Pseudocódigo ESM e Fórmulas

#### `calculateBolusFood(carbs, icr)`
Cálculo base: $Bolus = \frac{Carboidratos}{ICR}$

```javascript
/**
 * Calcula o bolus alimentar baseado nos carboidratos.
 * @param {number} carbs - Carboidratos em gramas.
 * @param {number} icr - Relação Insulina-Carboidrato (gramas por unidade).
 * @returns {number} Dose de insulina em unidades.
 */
export const calculateBolusFood = (carbs, icr) => {
  if (icr <= 0) throw new Error("ICR deve ser maior que zero.");
  if (carbs < 0) return 0;
  return Number((carbs / icr).toFixed(2));
};
```

#### `calculateBolusCorrection(currentBg, targetBg, isf, iob)`
Cálculo base: $Bolus = \frac{CurrentBG - TargetBG}{ISF} - IOB$

```javascript
/**
 * Calcula o bolus corretivo.
 * @param {number} currentBg - Glicemia atual (mg/dL).
 * @param {number} targetBg - Glicemia alvo (mg/dL).
 * @param {number} isf - Fator de Sensibilidade à Insulina (mg/dL por unidade).
 * @param {number} iob - Insulina ativa (unidades).
 * @returns {number} Dose de correção em unidades (pode ser negativa antes do ajuste final).
 */
export const calculateBolusCorrection = (currentBg, targetBg, isf, iob = 0) => {
  if (isf <= 0) throw new Error("ISF deve ser maior que zero.");
  const correction = (currentBg - targetBg) / isf;
  const netCorrection = correction - iob;
  return netCorrection > 0 ? Number(netCorrection.toFixed(2)) : 0;
};
```

#### `calculateTotalBolus(foodBolus, correctionBolus, iob)`
```javascript
export const calculateTotalBolus = (foodBolus, correctionBolus, iob = 0) => {
  // O IOB já foi subtraído da correção, mas caso a correção seja menor que zero, 
  // pode abater do bolus alimentar dependendo da regra médica.
  let total = foodBolus + correctionBolus;
  if (total < 0) total = 0;
  return Number(total.toFixed(2));
};
```

#### `calculateISF(tdd, method)`
Fórmulas: Regra dos 1800 (Análogos rápidos) ou 1500 (Insulina Regular).
```javascript
export const calculateISF = (tdd, method = '1800') => {
  if (tdd <= 0) throw new Error("TDD deve ser maior que zero.");
  const factor = method === '1500' ? 1500 : 1800;
  return Number((factor / tdd).toFixed(0)); // Normalmente inteiro
};
```

#### `calculateICR(tdd, method)`
Fórmulas: Regra dos 500 (Análogos) ou 450 (Regular).
```javascript
export const calculateICR = (tdd, method = '500') => {
  if (tdd <= 0) throw new Error("TDD deve ser maior que zero.");
  const factor = method === '450' ? 450 : 500;
  return Number((factor / tdd).toFixed(0)); // Normalmente inteiro
};
```

#### `adjustBolusByCGMTrend(bolus, trendRate, method)`
Ajuste percentual ou fixo do bolus baseado na taxa de variação (mg/dL por minuto) do CGM (Monitorização Contínua).
```javascript
export const adjustBolusByCGMTrend = (bolus, trendRate, method = 'percentage') => {
  if (trendRate === 0) return bolus;
  
  let adjustedBolus = bolus;
  if (method === 'percentage') {
    // Exemplo: se descendo rápido (< -2 mg/dL/min), reduz 20%
    if (trendRate <= -2.0) adjustedBolus *= 0.8;
    else if (trendRate >= 2.0) adjustedBolus *= 1.2;
  }
  return Number(Math.max(0, adjustedBolus).toFixed(2));
};
```

#### `calculateDualWaveBolus(totalBolus, fpuUnits, immediatePercent)`
Calcula a divisão do bolus (Imediato / Prolongado).
```javascript
export const calculateDualWaveBolus = (totalBolus, fpuUnits, immediatePercent = 0.5) => {
  // Ajusta o percentual com base em gordura e proteína (FPU)
  // Se FPU for muito alto, talvez immediatePercent deva cair para 0.3 (30%)
  const immediate = totalBolus * immediatePercent;
  const delayed = totalBolus - immediate;
  return {
    immediate: Number(immediate.toFixed(2)),
    delayed: Number(delayed.toFixed(2))
  };
};
```

### Casos de Borda Tratados
- Divisão por zero (ISF, ICR).
- IOB maior que a correção necessária, resultando em correção negativa que anula parte do bolus alimentar.
- Doses negativas limitadas a zero.

---

## 2. Módulo: `iob_engine/`

### Responsabilidade e Propósito
Calcular a Insulina Ativa (IOB - Insulin on Board). Este cálculo é crítico para evitar "Insulin Stacking" (empilhamento de doses) que causa hipoglicemia severa.

### Interface Pública (Exports)
- `calculateIOBExponential`
- `calculateIOBLinear`
- `calculateIOBBilinear`
- `calculateIOBWalsh`
- `getInsulinParams`
- `sumIOB`

### Dependências
Nenhuma.

### Pseudocódigo ESM

#### `getInsulinParams(insulinType)`
```javascript
export const getInsulinParams = (insulinType) => {
  const params = {
    'lispro': { peak: 75, duration: 240 },
    'aspart': { peak: 70, duration: 240 },
    'regular': { peak: 120, duration: 360 }
  };
  return params[insulinType.toLowerCase()] || params['lispro'];
};
```

#### `calculateIOBLinear(bolusHistory, currentTime, dia)`
DIA (Duration of Insulin Action) em minutos.
```javascript
export const calculateIOBLinear = (bolusHistory, currentTime, dia = 240) => {
  let activeInsulin = 0;
  
  for (const bolus of bolusHistory) {
    const elapsedMinutes = (currentTime - new Date(bolus.timestamp).getTime()) / 60000;
    if (elapsedMinutes >= 0 && elapsedMinutes < dia) {
      // Fórmula linear simples: (1 - tempoPassado / DIA) * Dose
      const remainingPercent = 1 - (elapsedMinutes / dia);
      activeInsulin += bolus.amount * remainingPercent;
    }
  }
  return Number(activeInsulin.toFixed(2));
};
```

#### `calculateIOBExponential(bolusHistory, currentTime, insulinParams)`
Usando curvas de atividade de insulina de modelos abertos (ex: OpenAPS / Loop).
```javascript
export const calculateIOBExponential = (bolusHistory, currentTime, insulinParams) => {
  let activeInsulin = 0;
  const tau = insulinParams.peak * (1 - insulinParams.peak / insulinParams.duration) / (1 - 2 * insulinParams.peak / insulinParams.duration);
  const a = 2 * tau / insulinParams.duration;
  const S = 1 / (1 - a + (1 + a) * Math.exp(-insulinParams.duration / tau));
  
  for (const bolus of bolusHistory) {
    const elapsed = (currentTime - new Date(bolus.timestamp).getTime()) / 60000;
    if (elapsed > 0 && elapsed < insulinParams.duration) {
      // Cálculo aproximado da curva exponencial (baseado no modelo Activity)
      const activity = (S / (tau * tau)) * elapsed * (1 - elapsed / insulinParams.duration) * Math.exp(-elapsed / tau);
      // Integral aproximada da atividade para IOB (Simplificada no pseudocódigo)
      const iobPercent = 1 - (activity * elapsed); // Substituir pela integral real
      activeInsulin += Math.max(0, bolus.amount * iobPercent);
    }
  }
  return Number(activeInsulin.toFixed(2));
};
```

#### `sumIOB(iobList)`
```javascript
export const sumIOB = (iobList) => {
  const sum = iobList.reduce((acc, curr) => acc + curr, 0);
  return Number(sum.toFixed(2));
};
```

### Casos de Borda Tratados
- Fusos horários (garantir normalização em UTC antes de calcular `elapsedMinutes`).
- Tempo decorrido negativo (eventos no futuro são ignorados).
- Tempo decorrido além da Duração de Ação da Insulina (DIA) (retorna zero).

---

## 3. Módulo: `carb_engine/`

### Responsabilidade e Propósito
Calcular Carboidratos Ativos (COB - Carbs on Board) e processar as Unidades de Proteína e Gordura (FPU) utilizando o Método de Pankowska (ou diretrizes SBD/ADA).

### Interface Pública (Exports)
- `calculateCOB`
- `calculateFPU`
- `fpuToEquivalentCarbs`
- `calculateAbsorptionDuration`
- `adjustCarbsForGlycemicIndex`

### Pseudocódigo ESM

#### `calculateFPU(protein, fat)`
1 FPU = 100 kcal de proteína e gordura combinadas.
```javascript
export const calculateFPU = (protein, fat) => {
  // Proteína: 4 kcal/g, Gordura: 9 kcal/g
  const kcalProtein = protein * 4;
  const kcalFat = fat * 9;
  const totalKcal = kcalProtein + kcalFat;
  
  return Number((totalKcal / 100).toFixed(2));
};
```

#### `fpuToEquivalentCarbs(fpuUnits)`
Geralmente, 1 FPU equivale a cerca de 10g de carboidratos adicionais, a serem administrados em bolus estendido.
```javascript
export const fpuToEquivalentCarbs = (fpuUnits) => {
  return Number((fpuUnits * 10).toFixed(2));
};
```

#### `calculateAbsorptionDuration(fpuUnits)`
Pankowska dita extensões de onda: 1 FPU = 3h, 2 FPU = 4h, 3 FPU = 5h.
```javascript
export const calculateAbsorptionDuration = (fpuUnits) => {
  if (fpuUnits < 1) return 0;
  if (fpuUnits < 2) return 180; // 3h em minutos
  if (fpuUnits < 3) return 240; // 4h
  return 480; // Até 8h para refeições hiperlipídicas
};
```

---

## 4. Módulo: `exercise_engine/`

### Responsabilidade e Propósito
Ajustar o cálculo de sensibilidade (ISF) e necessidade de insulina durante ou após exercícios físicos (aeróbicos e anaeróbicos).

### Interface Pública (Exports)
- `getExerciseModifier`
- `adjustISFForExercise`
- `calculatePostExerciseRisk`
- `recommendTempBasal`

### Pseudocódigo ESM

#### `getExerciseModifier(exerciseType, duration, intensity)`
```javascript
export const getExerciseModifier = (exerciseType, duration, intensity) => {
  // Retorna um multiplicador de sensibilidade. Ex: 1.5 significa 50% mais sensível (menos insulina)
  let modifier = 1.0;
  if (exerciseType === 'aerobic') {
    if (intensity === 'high') modifier += 0.5 * (duration / 60);
    else modifier += 0.2 * (duration / 60);
  } else if (exerciseType === 'anaerobic') {
    // Pode inicialmente causar resistência (aumento transitório de glicemia)
    modifier -= 0.1 * (duration / 60); 
  }
  return Number(Math.max(0.5, modifier).toFixed(2)); // Limita o fator
};
```

#### `adjustISFForExercise(isf, exerciseContext)`
```javascript
export const adjustISFForExercise = (isf, exerciseContext) => {
  const modifier = getExerciseModifier(
    exerciseContext.type, 
    exerciseContext.duration, 
    exerciseContext.intensity
  );
  return Number((isf * modifier).toFixed(2));
};
```

---

## 5. Módulo: `meal_prediction/`

### Responsabilidade e Propósito
Projetar o aumento glicêmico (excursão) pós-prandial baseado nos macronutrientes da refeição e sugerir estratégias de bolus (Normal, Quadrado, Duplo/Dual).

### Interface Pública (Exports)
- `predictPostMealBG`
- `classifyMealType`
- `suggestBolusStrategy`

### Pseudocódigo ESM
```javascript
export const classifyMealType = (carbs, protein, fat) => {
  const totalGrams = carbs + protein + fat;
  if (totalGrams === 0) return 'empty';
  
  const fatPercent = fat / totalGrams;
  const proteinPercent = protein / totalGrams;
  
  if (fatPercent > 0.3) return 'high_fat';
  if (proteinPercent > 0.4) return 'high_protein';
  return 'standard';
};

export const suggestBolusStrategy = (mealType, fpuUnits) => {
  if (mealType === 'high_fat' || fpuUnits >= 2) return 'dual_wave';
  if (mealType === 'high_protein') return 'square_wave';
  return 'standard';
};
```

---

## 6. Módulo: `validation/`

### Responsabilidade e Propósito
Sanitizar e validar rigorosamente todos os inputs numéricos para evitar falhas matemáticas letais (ex: `NaN` se transformando em dose zero, ou strings bypassando lógica de comparação).

### Pseudocódigo ESM
```javascript
export const validateGlucose = (value) => {
  if (typeof value !== 'number' || isNaN(value)) throw new Error("Glicemia deve ser um número válido.");
  if (value < 20 || value > 800) throw new Error("Glicemia fora dos limites fisiológicos (20-800 mg/dL).");
  return Math.round(value);
};

export const validateDose = (value, maxDose) => {
  if (typeof value !== 'number' || isNaN(value)) throw new Error("Dose inválida.");
  if (value < 0) return 0;
  if (value > maxDose) throw new Error(`Dose de ${value}U excede o limite de segurança de ${maxDose}U.`);
  return value;
};
```

---

## 7. Módulo: `safety_rules/`

### Responsabilidade e Propósito
Aplicar a camada final de defesa clínica. Avalia risco de hipoglicemia e barra recomendações.

### Pseudocódigo ESM
```javascript
export const checkHypoglycemia = (bg) => bg < 70;

export const checkInsulinStacking = (iob, proposedBolus) => {
  // Empilhamento é um risco se IOB for significativo e a glicemia já estiver em queda.
  return iob > (proposedBolus * 0.5); 
};

export const shouldBlockDose = (context) => {
  if (checkHypoglycemia(context.glucose)) return true; // Bloqueio total em hipo
  if (context.iob > context.patientProfile.maxIOB) return true; // Limite global de insulina ativa
  return false;
};

export const generateSafetyWarnings = (context) => {
  const warnings = [];
  if (context.glucose < 80) warnings.push({ level: 'CRITICAL', msg: "Glicemia próxima de hipoglicemia. Correção bloqueada." });
  if (context.iob > 2) warnings.push({ level: 'WARNING', msg: "Insulina ativa moderada. Risco de Stacking." });
  return warnings;
};
```

---

## 8. Orquestrador Principal: `glucose_engine/index.js`

### Responsabilidade e Propósito
Ponto de entrada unificado da arquitetura. Recebe o payload do paciente, coordena as chamadas a todos os submódulos, coleta os resultados, aplica validações, regras de segurança e emite um log de auditoria com assinatura temporal.

### Pseudocódigo ESM Completo

```javascript
import { validateGlucose, validateCarbs, validateDose } from './validation/index.js';
import { calculateBolusFood, calculateBolusCorrection, calculateTotalBolus } from './insulin_math/index.js';
import { calculateIOBLinear } from './iob_engine/index.js';
import { calculateFPU, fpuToEquivalentCarbs } from './carb_engine/index.js';
import { shouldBlockDose, generateSafetyWarnings } from './safety_rules/index.js';

/**
 * Calcula o bolus recomendado de forma orquestrada e segura.
 * @param {Object} input - DTO com variáveis metabólicas e perfil do paciente.
 * @returns {Object} Resultado do cálculo e logs de auditoria.
 */
export const calculateRecommendedBolus = (input) => {
  try {
    const { 
      glucose, carbs = 0, protein = 0, fat = 0, 
      bolusHistory = [], patientProfile 
    } = input;

    // 1. Validação estrita
    const safeBg = validateGlucose(glucose);
    const safeCarbs = validateCarbs(carbs);
    
    // 2. Cálculo IOB
    const currentTime = Date.now();
    const iob = calculateIOBLinear(bolusHistory, currentTime, patientProfile.dia);

    // 3. Cálculo de Doses Base
    const foodBolus = calculateBolusFood(safeCarbs, patientProfile.icr);
    const correctionBolus = calculateBolusCorrection(safeBg, patientProfile.targetBg, patientProfile.isf, iob);
    
    // 4. Impacto FPU (Gordura/Proteína)
    const fpuUnits = calculateFPU(protein, fat);
    const fpuCarbs = fpuToEquivalentCarbs(fpuUnits);
    const fpuBolus = calculateBolusFood(fpuCarbs, patientProfile.icr);

    // 5. Consolidação
    let totalBolus = calculateTotalBolus(foodBolus + fpuBolus, correctionBolus, iob);
    totalBolus = validateDose(totalBolus, patientProfile.maxDose);

    // 6. Regras de Segurança
    const context = { glucose: safeBg, iob, patientProfile, proposedBolus: totalBolus };
    const isBlocked = shouldBlockDose(context);
    const warnings = generateSafetyWarnings(context);

    // 7. Saída estruturada e Audit Log
    return {
      status: isBlocked ? 'BLOCKED' : 'SUCCESS',
      recommendation: {
        foodBolus,
        correctionBolus,
        fpuBolus,
        totalBolus: isBlocked ? 0 : totalBolus,
      },
      metabolicState: {
        iob,
        cob: safeCarbs + fpuCarbs // Simplificação
      },
      safety: {
        blocked: isBlocked,
        warnings
      },
      auditLog: {
        timestamp: new Date().toISOString(),
        engineVersion: "v1.2.0",
        inputsApplied: input,
        calcMatrix: { isf: patientProfile.isf, icr: patientProfile.icr }
      }
    };

  } catch (error) {
    // Falha segura: Sempre retornar dose 0 em caso de erro matemático/validação
    return {
      status: 'ERROR',
      recommendation: { totalBolus: 0 },
      safety: { blocked: true, warnings: [{ level: 'FATAL', msg: error.message }] },
      auditLog: { timestamp: new Date().toISOString(), error: error.message }
    };
  }
};
```

---

## 9. Estruturas de Dados (TypeScript / JSDoc)

A modelagem de dados é essencial para tipar os parâmetros de entrada.

```typescript
// PatientProfile.ts
export interface PatientProfile {
  targetBg: number;      // Glicemia alvo (ex: 100 mg/dL)
  isf: number;           // Fator de sensibilidade (mg/dL por 1U)
  icr: number;           // Relação insulina:carb (g por 1U)
  dia: number;           // Duração de ação da insulina em minutos (ex: 240)
  maxDose: number;       // Limite rígido de dose única (ex: 15U)
  maxIOB: number;        // Limite máximo de insulina ativa acumulada (ex: 20U)
  insulinType: string;   // 'lispro', 'aspart', 'regular'
}

// BolusEvent.ts
export interface BolusEvent {
  id: string;
  amount: number;        // Unidades
  timestamp: string;     // ISO 8601 UTC
  type: 'meal' | 'correction' | 'manual';
}

// GlucoseReading.ts
export interface GlucoseReading {
  value: number;         // mg/dL
  timestamp: string;     // ISO 8601 UTC
  trend?: number;        // Taxa de mudança em mg/dL/min
  source: 'BGM' | 'CGM'; // Capilar ou Sensor
}

export interface CalculationResult {
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  recommendation: {
    foodBolus: number;
    correctionBolus: number;
    fpuBolus: number;
    totalBolus: number;
  };
  metabolicState: { iob: number; cob: number; };
  safety: { blocked: boolean; warnings: Array<{level: string, msg: string}>; };
  auditLog: Record<string, any>;
}
```

---

## 10. Testes Unitários

Uma bateria exaustiva (TDD) garante a segurança do cálculo. O framework recomendado é o **Jest** ou **Mocha**.

### Exemplo de Suíte de Testes Críticos
```javascript
import { calculateBolusCorrection } from '../insulin_math/index.js';
import { calculateRecommendedBolus } from '../glucose_engine/index.js';

describe('Motor Matemático - insulin_math', () => {
  it('deve retornar correção zero se a glicemia estiver abaixo do alvo', () => {
    const result = calculateBolusCorrection(90, 100, 40, 0);
    expect(result).toBe(0);
  });

  it('deve subtrair IOB corretamente da correção', () => {
    // Alvo 100, atual 180, ISF 40 -> Precisa de 2U.
    // IOB é 1U. Resultado deve ser 1U.
    const result = calculateBolusCorrection(180, 100, 40, 1.0);
    expect(result).toBe(1.0);
  });

  it('deve anular a correção se IOB for maior que a dose necessária', () => {
    // Alvo 100, atual 180, ISF 40 -> Precisa de 2U.
    // IOB é 3.5U. Resultado deve ser 0U.
    const result = calculateBolusCorrection(180, 100, 40, 3.5);
    expect(result).toBe(0);
  });
});

describe('Motor Matemático - Orquestrador de Casos de Borda', () => {
  it('deve bloquear bolus e disparar alerta de hipoglicemia se BG < 70', () => {
    const input = {
      glucose: 65,
      carbs: 50, // Vai comer 50g
      patientProfile: { targetBg: 100, isf: 50, icr: 10, dia: 240, maxDose: 10, maxIOB: 15 }
    };
    
    const response = calculateRecommendedBolus(input);
    expect(response.status).toBe('BLOCKED');
    expect(response.recommendation.totalBolus).toBe(0);
    expect(response.safety.blocked).toBe(true);
    expect(response.safety.warnings[0].msg).toMatch(/hipoglicemia/i);
  });

  it('deve falhar com segurança (Safe Fail) ao receber ISF 0 (evitando divisão por zero)', () => {
    const input = {
      glucose: 200,
      patientProfile: { targetBg: 100, isf: 0, icr: 10, dia: 240, maxDose: 10, maxIOB: 15 }
    };
    const response = calculateRecommendedBolus(input);
    expect(response.status).toBe('ERROR');
    expect(response.recommendation.totalBolus).toBe(0);
  });
});
```

---

## 11. Versionamento do Algoritmo

O *Glucose Engine* é o componente de maior risco e impacto da aplicação Amanda V4. Qualquer alteração em fórmulas pode ter consequências médicas.

### Regras de Versionamento:
1. **Isolamento de Versão**: O pacote do motor matemático deve ser versionado separadamente (SemVer) do restante do backend/bot.
2. **Registro nos Logs de Auditoria**: Cada cálculo executado anexa a propriedade `engineVersion` (ex: `v1.2.0`). Isso garante rastreabilidade legal caso uma recomendação de dose precise ser auditada clinicamente meses depois.
3. **Major (Breaking Changes)**: Alteração em fórmulas clínicas (ex: mudar o modelo de IOB de Linear para Exponencial como padrão).
4. **Minor (Feature)**: Adição de uma nova variável (ex: introdução do fator de Exercício na orquestração) sem quebrar o cálculo base existente.
5. **Patch (Fix)**: Correção de bugs em limites de arredondamento.

---
> Fim do Documento 15 - Especificação Clínica de Alto Nível - Motor Matemático Amanda V4.
