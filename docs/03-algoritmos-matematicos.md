# Documento 03 — Algoritmos Matemáticos para Cálculo de Insulina

> [!CAUTION]
> **AVISO MÉDICO E LEGAL (DISCLAIMER):** Este documento descreve algoritmos matemáticos e lógicas de programação para sistemas de suporte à decisão clínica em diabetes. As informações e cálculos aqui presentes **não substituem o aconselhamento médico profissional, diagnóstico ou tratamento**. O uso de equações de cálculo de dose de insulina deve ser supervisionado e ajustado por um endocrinologista ou médico especialista capacitado. O desenvolvimento de software baseado nestes algoritmos exige testes exaustivos e aprovação de entidades regulatórias competentes antes do uso clínico. A implementação incorreta pode resultar em hipoglicemia severa ou cetoacidose diabética (CAD), condições potencialmente fatais.

---

## 1. ICR — Insulin-to-Carb Ratio (Relação Insulina:Carboidrato)

### Definição
O *Insulin-to-Carb Ratio* (ICR), ou Relação Insulina-Carboidrato, indica quantos gramas de carboidrato são "cobertos" (metabolizados) por uma (1) unidade de insulina de ação rápida ou ultrarrápida. É um pilar fundamental da terapia com contagem de carboidratos, permitindo a personalização do bolus prandial (alimentar) de acordo com o que o paciente vai ingerir.

### Fórmula da Regra dos 500
A Regra dos 500 é o método mais amplamente utilizado para estimar inicialmente o ICR de um paciente utilizando insulinas análogas de ação rápida (como Lispro, Asparte, Glulisina).

**Fórmula Matemática:**
$$ ICR = \frac{500}{TDD} $$
Onde $TDD$ é a Dose Total Diária de insulina (Total Daily Dose) em unidades.

**Pseudocódigo:**
```javascript
/**
 * Calcula o ICR usando a regra dos 500
 * @param {number} tdd Dose Total Diária em unidades
 * @returns {number} Relação Insulina:Carboidrato (g/U)
 */
function calcularICR_Regra500(tdd) {
    if (tdd <= 0) throw new Error("TDD deve ser maior que zero.");
    return 500 / tdd;
}
```

**Exemplo Numérico Completo:**
- Paciente utiliza 20U de insulina basal e 20U de bolus por dia em média.
- TDD = 20 + 20 = 40U.
- ICR = 500 / 40 = 12.5.
- Resultado: 1 unidade de insulina cobre 12,5 gramas de carboidrato.

**Casos de Borda (Edge Cases):**
- **Crianças e bebês:** O TDD pode ser muito pequeno (ex: 5U), gerando ICR = 100g/U. Deve-se considerar se a regra dos 500 se aplica fielmente.
- **Resistência insulínica alta (obesidade, puberdade, gestação):** TDD pode ser >150U, gerando ICR <3.3g/U.

**Referência Bibliográfica:**
- Walsh, J., & Roberts, R. (2006). *Pumping Insulin*. Torrey Pines Press.
- American Diabetes Association (ADA) Standards of Medical Care in Diabetes.

### Fórmula Alternativa da Regra dos 450
A Regra dos 450 é utilizada quando o paciente utiliza insulina Regular humana em vez de análogos ultrarrápidos, devido ao perfil de ação mais longo.

**Fórmula Matemática:**
$$ ICR_{regular} = \frac{450}{TDD} $$

**Pseudocódigo:**
```javascript
function calcularICR_Regra450(tdd) {
    if (tdd <= 0) throw new Error("TDD deve ser maior que zero.");
    return 450 / tdd;
}
```

**Exemplo Numérico Completo:**
- Paciente usa insulina Regular, TDD = 30U.
- ICR = 450 / 30 = 15g/U.

### Perfil por Horário (Time-Slot Profile) — Pilar 2 do Sistema

Como a sensibilidade à insulina varia ao longo do dia (efeito dos hormônios contrarreguladores: cortisol, GH, adrenalina), o sistema **deve suportar múltiplos valores de ICR e ISF por período**, ao invés de um valor único fixo.

**Tabela de Variação Clínica — 4 Períodos (Exemplo real TDD=40U):**

| Período | Horário | Fenômeno Fisiológico | ICR (g/U) | ISF (mg/dL/U) | Alvo (mg/dL) |
|---------|---------|----------------------|-----------|-------------|--------------|
| **Café da Manhã** | 06:00–11:59 | Dawn Phenomenon (cortisol elevado) | **8–10** | **30–35** | 100 |
| **Almoço** | 12:00–17:59 | Sensibilidade padrão | **12–15** | **40–45** | 100 |
| **Jantar** | 18:00–21:59 | Leve resistência vespertina | **10–12** | **35–40** | 110 |
| **Madrugada** | 22:00–05:59 | Máxima sensibilidade, risco de hipo | **15–20** | **50–60** | 120 |

> [!CAUTION]
> O ICR da madrugada é mais generoso (cobre mais carboidrato por unidade) porque a sensibilidade à insulina é máxima durante o sono. Um ICR muito agressivo nesse período é uma das principais causas de hipoglicemia noturna.

**Schema JSON do Perfil de Horário (PatientInsulinProfile):**

```json
{
  "profileId": "uuid-v4",
  "profileName": "Perfil Padrão Verão",
  "isActive": true,
  "timezone": "America/Sao_Paulo",
  "diaHours": 4.0,
  "insulinType": "ASPART",
  "deviceIncrement": 0.1,
  "maxSingleDose": 15.0,
  "segments": [
    {
      "label": "Café da Manhã",
      "startTime": "06:00",
      "endTime": "11:59",
      "icr": 9.0,
      "isf": 32.0,
      "targetBG": 100
    },
    {
      "label": "Almoço",
      "startTime": "12:00",
      "endTime": "17:59",
      "icr": 13.0,
      "isf": 42.0,
      "targetBG": 100
    },
    {
      "label": "Jantar",
      "startTime": "18:00",
      "endTime": "21:59",
      "icr": 11.0,
      "isf": 38.0,
      "targetBG": 110
    },
    {
      "label": "Madrugada",
      "startTime": "22:00",
      "endTime": "05:59",
      "icr": 17.0,
      "isf": 55.0,
      "targetBG": 120
    }
  ]
}
```

**Lógica de Lookup por Horário (ESM):**

```javascript
/**
 * Obtém o segmento de perfil ativo para o horário atual
 * @param {Array<Segment>} segments - Segmentos do perfil do paciente
 * @param {Date} now - Momento atual
 * @returns {Segment} Segmento ativo
 */
export function getActiveSegment(segments, now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const seg of segments) {
    const [startH, startM] = seg.startTime.split(':').map(Number);
    const [endH, endM] = seg.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    // Segmento que cruza meia-noite (ex: 22:00 – 05:59)
    if (startMin > endMin) {
      if (currentMinutes >= startMin || currentMinutes <= endMin) return seg;
    } else {
      if (currentMinutes >= startMin && currentMinutes <= endMin) return seg;
    }
  }

  // Fallback: retornar primeiro segmento se não encontrar (nunca deve ocorrer com perfil válido)
  return segments[0];
}

// Uso:
const segment = getActiveSegment(profile.segments);
const { icr, isf, targetBG } = segment;
```

**Validações obrigatórias do perfil de horários:**
- Os segmentos devem cobrir as 24 horas completamente sem gaps ou sobrepostos
- Mínimo: 1 segmento (ICR/ISF único para o dia todo)
- Máximo: 48 segmentos (blocos de 30 minutos — padrão de bombas modernas)
- ICR mínimo aceitável: 2 g/U | máximo: 100 g/U
- ISF mínimo aceitável: 5 mg/dL/U | máximo: 200 mg/dL/U

---

## 2. ISF — Insulin Sensitivity Factor (Fator de Sensibilidade à Insulina)

### Definição
O *Insulin Sensitivity Factor* (ISF), ou Fator de Sensibilidade (FS), também chamado de Fator de Correção, representa a queda na glicemia (em mg/dL ou mmol/L) esperada após a administração de 1 unidade de insulina rápida/ultrarrápida.

### Regra dos 1800 (Análogos Rápidos)
A mais utilizada para insulinas como Lispro, Asparte e Glulisina, em medições por mg/dL. Para mmol/L, utiliza-se a regra dos 100.

**Fórmula Matemática:**
$$ ISF_{mg/dL} = \frac{1800}{TDD} $$

**Pseudocódigo:**
```javascript
/**
 * Calcula o ISF pela regra dos 1800
 * @param {number} tdd Dose Total Diária (U)
 * @returns {number} Fator de Sensibilidade (mg/dL por U)
 */
function calcularISF_Regra1800(tdd) {
    if (tdd <= 0) throw new Error("TDD deve ser maior que zero.");
    return 1800 / tdd;
}
```

**Exemplo Numérico Completo:**
- TDD = 45U.
- ISF = 1800 / 45 = 40 mg/dL/U.
- Uma (1) unidade reduzirá a glicemia em 40 mg/dL.

**Casos de Borda:**
- **Atletas de alta performance:** ISF muito sensível, exigindo ajustes manuais. A regra pode subestimar a sensibilidade.
- **Divisão por zero:** Proteção de código necessária (validação do TDD).

**Referência Bibliográfica:**
- Davidson PC, Hebblewhite HR, Steed RD, Bode BW. *Analysis of guidelines for basal-bolus insulin dosing: basal insulin, correction factor, and carbohydrate-to-insulin ratio.* Endocr Pract. 2008.

### Regra dos 1500 (Insulina Regular) e 1700 (Intermediária/Gestantes)
- **Regra 1500:** Usada com Insulina Regular humana. $ISF = 1500 / TDD$.
- **Regra 1700:** Para casos específicos de maior segurança ou análogos antigos.

---

## 3. TDD — Total Daily Dose (Dose Total Diária)

### Como Calcular
A TDD é a soma de toda a insulina administrada em um período de 24 horas (basal + bolus). Para iniciar a terapia, pode ser baseada no peso.

**Fórmula Matemática:**
$$ TDD = Peso (kg) \times Fator_{peso} $$
Onde $Fator_{peso}$ geralmente varia de 0.4 a 1.0 U/kg/dia (0.5 a 0.6 é o padrão para DM1).

**Divisão Basal/Bolus:**
A fisiologia de uma pessoa sem diabetes segrega cerca de 50% de insulina como basal contínua e 50% como prandial (bolus). 

**Pseudocódigo de Inicialização:**
```javascript
function inicializarTerapia(pesoKg, tipo="padrao") {
    let fator = 0.55; // Padrão DM1
    if (tipo === "puberdade") fator = 0.8;
    if (tipo === "lua_de_mel") fator = 0.3;
    
    let tdd = pesoKg * fator;
    return {
        tdd: tdd,
        basalDiaria: tdd * 0.5,
        bolusDiarioEsperado: tdd * 0.5
    };
}
```

---

## 4. Bolus Alimentar

### Definição e Fórmula
O bolus alimentar é a dose de insulina administrada exclusivamente para metabolizar os carboidratos de uma refeição.

**Fórmula Matemática:**
$$ Bolus_{alim} = \frac{Carboidratos (g)}{ICR (g/U)} $$

**Pseudocódigo:**
```javascript
function calcularBolusAlimentar(carbsG, icr) {
    if (icr <= 0) throw new Error("ICR inválido");
    if (carbsG < 0) return 0;
    return carbsG / icr;
}
```

**Exemplo Passo a Passo:**
- Carboidratos na refeição: 60g (ex: arroz, feijão, suco)
- ICR do almoço: 15g/U
- Bolus = 60 / 15 = 4.0U

### Ajuste por Pré-bolus (Timing)
O timing ideal para o bolus de análogos rápidos é de 15 a 20 minutos antes da refeição. Este não altera a dose matemática, mas o impacto no algoritmo envolve deslocar o pico de IOB para alinhar com o pico de COB (Carbs on Board).

### Ajuste por Exercício Futuro
Se um exercício está planejado para logo após a refeição, o bolus alimentar deve ser reduzido (geralmente entre 25% a 50%).
$$ Bolus_{alim_{exercicio}} = Bolus_{alim} \times (1 - PercentualReducao) $$

---

## 5. Bolus Corretivo

### Definição e Fórmula
Calculado quando a glicemia atual não está no valor alvo.

**Fórmula Matemática:**
$$ Bolus_{corr} = \frac{Glicemia_{atual} - Alvo}{ISF} $$

**Correção Positiva (Hiperglicemia):**
Glicemia = 220 mg/dL, Alvo = 100 mg/dL, ISF = 40.
Bolus = (220 - 100) / 40 = 120 / 40 = 3.0U.

**Correção Negativa (Abaixo do alvo e ingerindo carboidratos):**
Se Glicemia = 70 mg/dL, Alvo = 100, ISF = 40.
Bolus = (70 - 100) / 40 = -0.75U.
Esta correção negativa será usada para deduzir o bolus total se o paciente for comer.

**Pseudocódigo:**
```javascript
function calcularBolusCorretivo(bgAtual, bgAlvo, isf) {
    if (isf <= 0) throw new Error("ISF inválido");
    return (bgAtual - bgAlvo) / isf;
}
```

---

## 6. Bolus Total

### Fórmula Completa
O bolus sugerido pela bomba de insulina ou sistema de decisão.

**Fórmula Matemática:**
$$ Bolus_{total} = Bolus_{alim} + Bolus_{corr} - IOB $$

Onde IOB (Insulin on Board) é deduzida da correção para evitar o *stacking* (empilhamento de insulina), mas geralmente **não deduz do bolus alimentar** na maioria dos modelos simples, a não ser em algoritmos avançados.
Na prática clínica de bombas tradicionais:
Se $Bolus_{corr} > 0$: 
$$ Bolus_{total} = Bolus_{alim} + \max(0, Bolus_{corr} - IOB) $$

Se $Bolus_{corr} < 0$: (Abaixo da meta, subtrair sempre)
$$ Bolus_{total} = Bolus_{alim} + Bolus_{corr} $$ (ignora-se o IOB ou avalia-se individualmente, pois insulina já ativa fará cair ainda mais).

**Regras de Segurança e Arredondamento:**
O bolus final deve ser $\ge 0$. Não existe bolus negativo (embora suspenda basal, isso é tratado no sistema de alça fechada).
As bombas modernas têm incrementos de 0.05U ou 0.1U, canetas possuem 0.5U ou 1U.

**Pseudocódigo (Lógica de Bomba Tradicional):**
```javascript
function calcularBolusTotalTradicional(bAlim, bCorr, iob, incremento) {
    let bolusT = 0;
    
    if (bCorr >= 0) {
        let correcaoEfetiva = bCorr - iob;
        if (correcaoEfetiva < 0) correcaoEfetiva = 0; // IOB não reduz comida
        bolusT = bAlim + correcaoEfetiva;
    } else {
        // Glicose baixa, reduzimos a comida para aumentar glicemia
        bolusT = bAlim + bCorr; // Nota: bCorr é negativo
    }
    
    // Regra de segurança
    if (bolusT < 0) bolusT = 0;
    
    // Arredondamento
    let fatores = 1 / incremento;
    return Math.round(bolusT * fatores) / fatores;
}
```

---

## 6.5. Fórmula Final Consolidada — Dose Recomendada

> [!IMPORTANT]
> Esta é a fórmula canônica final, consolidada a partir das referências clínicas internacionais (ADA, Walsh, OpenAPS). É o coração do sistema de cálculo.

### Fórmula Canônica

$$
Dose\_Recomendada = Bolus\_Alimentacao + \max(0, \; Bolus\_Correcao - IOB)
$$

Onde:
- **Bolus_Alimentacao** = `Gramas_Carboidrato / ICR`
- **Bolus_Correcao** = `(Glicemia_Atual - Glicemia_Alvo) / ISF`
- **IOB** = Insulina ativa de doses anteriores (modelo linear ou exponencial)
- **MAX(0, ...)** = garante que o componente corretivo nunca cause dose negativa isolada

### Raciocínio Clínico

| Situação | Bolus_Corr | IOB | MAX(0, Corr - IOB) | Resultado |
|----------|-----------|-----|-------------------|-----------|
| BG alta, sem IOB | +3,0U | 0U | 3,0U | Corrige + alimenta |
| BG alta, com IOB | +3,0U | 2,5U | 0,5U | Correge parcialmente |
| BG alta, IOB > correção | +1,0U | 2,5U | 0U | Não adiciona correção |
| BG normal, sem IOB | 0U | 0U | 0U | Só bolus alimentar |
| BG baixa | −1,5U | 0U | −1,5U → 0U | Reduz bolus alimentar |

> [!CAUTION]
> **Nota sobre glicemia abaixo do alvo:** Quando `Bolus_Correcao < 0` (BG abaixo do alvo), o comportamento depende da implementação:
> - **Modelo conservador (padrão):** `Dose = max(0, Bolus_Alimentacao + Bolus_Correcao)` — pode reduzir o bolus alimentar
> - **Modelo de segurança rígida:** `Dose = Bolus_Alimentacao` (ignora correção negativa, pois a refeição vai elevar a BG)
> - O sistema deve exibir aviso explícito ao usuário em qualquer caso

### Pseudocódigo ESM Completo (Função Principal)

```javascript
/**
 * Calcula a dose recomendada de bolus — Função Principal do Motor
 * Fórmula: Dose = Bolus_Alim + MAX(0, Bolus_Corr - IOB)
 *
 * @param {Object} input
 * @param {number} input.carbsG          - Carboidratos em gramas
 * @param {number} input.currentBG       - Glicemia atual (mg/dL)
 * @param {number} input.targetBG        - Glicemia alvo (mg/dL)
 * @param {number} input.icr             - Relação Insulina:Carb (g/U)
 * @param {number} input.isf             - Fator de Sensibilidade (mg/dL/U)
 * @param {number} input.iob             - Insulina ativa atual (U)
 * @param {number} input.maxSingleDose   - Dose máxima configurada pelo médico (U)
 * @returns {Object} Resultado detalhado do cálculo
 */
export async function calculateRecommendedBolus(input) {
  const { carbsG, currentBG, targetBG, icr, isf, iob, maxSingleDose = 15 } = input;

  // --- SAFETY: Validações obrigatórias antes de qualquer cálculo ---
  if (currentBG < 70) {
    return {
      blocked: true,
      reason: 'HYPOGLYCEMIA_ACTIVE',
      message: 'Glicemia abaixo de 70 mg/dL. Trate a hipoglicemia antes de calcular qualquer dose.',
      recommendedAction: 'Ingira 15–20g de carboidrato de rápida absorção. Reavalie em 15 minutos.'
    };
  }
  if (icr <= 0 || isf <= 0) throw new Error('ERR_INVALID_FACTOR_DIV_ZERO');
  if (carbsG < 0) throw new Error('ERR_NEGATIVE_CARBS');

  // --- CÁLCULOS ---
  const bolusFoodU = carbsG / icr;
  const bolusCorrectionU = (currentBG - targetBG) / isf;
  const iobSafe = Math.max(0, iob); // IOB nunca pode ser negativo
  const correctionAfterIOB = Math.max(0, bolusCorrectionU - iobSafe);
  let totalBolusU = bolusFoodU + correctionAfterIOB;

  // Ajuste quando BG abaixo do alvo (correção negativa reduz bolus alimentar)
  if (bolusCorrectionU < 0) {
    totalBolusU = Math.max(0, bolusFoodU + bolusCorrectionU);
  }

  // --- SAFETY: Limite máximo de dose ---
  const doseWasCapped = totalBolusU > maxSingleDose;
  const finalDoseU = Math.min(totalBolusU, maxSingleDose);

  return {
    blocked: false,
    bolusFoodU: +bolusFoodU.toFixed(2),
    bolusCorrectionRawU: +bolusCorrectionU.toFixed(2),
    correctionAfterIOBU: +correctionAfterIOB.toFixed(2),
    iobAppliedU: +iobSafe.toFixed(2),
    totalRecommendedU: +finalDoseU.toFixed(2),
    doseWasCapped,
    warnings: doseWasCapped ? ['DOSE_CAPPED_AT_MAX'] : [],
  };
}
```

**Exemplos numéricos:**

*Exemplo 1 — Refeição com hiperglicemia e IOB:*
- BG = 220 mg/dL | Alvo = 100 | ICR = 15 | ISF = 40 | Carbs = 60g | IOB = 1,5U
- Bolus_Alim = 60 / 15 = **4,0U**
- Bolus_Corr = (220 − 100) / 40 = 120/40 = **3,0U**
- MAX(0, 3,0 − 1,5) = **1,5U**
- **Dose Total = 4,0 + 1,5 = 5,5U** ✅

*Exemplo 2 — Apenas correção com IOB elevado:*
- BG = 180 mg/dL | Alvo = 100 | ISF = 40 | Carbs = 0g | IOB = 2,5U
- Bolus_Alim = 0U
- Bolus_Corr = (180 − 100) / 40 = **2,0U**
- MAX(0, 2,0 − 2,5) = MAX(0, −0,5) = **0U** (IOB já cobre)
- **Dose Total = 0U** — sistema deve informar que o IOB já está atuando ✅

*Exemplo 3 — BG abaixo do alvo com refeição:*
- BG = 80 mg/dL | Alvo = 100 | ICR = 12 | ISF = 40 | Carbs = 45g | IOB = 0U
- Bolus_Alim = 45 / 12 = **3,75U**
- Bolus_Corr = (80 − 100) / 40 = **−0,5U**
- **Dose Total = MAX(0, 3,75 + (−0,5)) = 3,25U** ✅ + alerta de BG baixa

---

## 7. IOB — Insulin on Board (Insulina Ativa)

### Definição
Quantidade de insulina injetada previamente que ainda tem efeito redutor de glicose. Crítico para impedir a hipoglicemia devido ao "stacking" de bolus sucessivos.

### Modelos Matemáticos

#### Modelo Linear Simples — Fórmula Canônica de Referência

Modelo de decaimento linear, utilizado em calculadoras manuais e aplicativos básicos. Adequado para uso em tela (sem loop fechado), pois é de fácil auditoria e compreensão pelo paciente.

**Fórmula Canônica (conforme referência clínica consolidada):**
$$
IOB(t) = Dose_{anterior} \times \left(1 - \frac{t}{DIA}\right) \quad \text{para } 0 \le t \le DIA
$$

Onde:
- $Dose_{anterior}$ = dose do bolus anterior em Unidades (U)
- $t$ = tempo decorrido desde a injeção em horas
- $DIA$ = Duration of Insulin Action — duração total da ação da insulina em horas (tipicamente 4h para análogos rápidos; 5–6h para Regular)
- Para $t > DIA$: $IOB(t) = 0$ (insulina completamente inativa)

**Tabela de decaimento — exemplo com 5U e DIA = 4h:**

| Tempo (h) | IOB Restante (U) | % Ativa |
|-----------|-----------------|--------|
| 0 | 5,00 | 100% |
| 0,5 | 4,38 | 87,5% |
| 1,0 | 3,75 | 75% |
| 1,5 | 3,13 | 62,5% |
| 2,0 | 2,50 | 50% |
| 2,5 | 1,88 | 37,5% |
| 3,0 | 1,25 | 25% |
| 3,5 | 0,63 | 12,5% |
| 4,0 | 0,00 | 0% |

**Pseudocódigo ESM:**
```javascript
/**
 * Calcula IOB pelo modelo linear simples (canônico)
 * @param {number} dosePreviousU - Dose anterior em unidades
 * @param {number} elapsedHours - Horas decorridas desde a injeção
 * @param {number} diaHours - Duração da ação da insulina em horas
 * @returns {number} IOB em unidades (sempre >= 0)
 */
export function calculateIOBLinear(dosePreviousU, elapsedHours, diaHours) {
  if (elapsedHours >= diaHours) return 0;
  if (elapsedHours < 0) return dosePreviousU; // Dose futura não deve ocorrer
  const iob = dosePreviousU * (1 - elapsedHours / diaHours);
  return Math.max(0, iob);
}

/**
 * Soma o IOB de múltiplos bolus anteriores
 * @param {Array<{dose: number, timestamp: Date}>} bolusHistory
 * @param {Date} now - Momento atual
 * @param {number} diaHours - DIA em horas
 * @returns {number} IOB total em unidades
 */
export function sumTotalIOBLinear(bolusHistory, now, diaHours) {
  return bolusHistory.reduce((total, entry) => {
    const elapsed = (now - entry.timestamp) / 3_600_000; // ms → horas
    return total + calculateIOBLinear(entry.dose, elapsed, diaHours);
  }, 0);
}
```

**Limitações do modelo linear:**
- Superestima o IOB no início da ação (primeiros 30–60 min, quando a insulina ainda está sendo absorvida)
- Subestima o IOB no final (não captura a cauda farmacodinâmica real)
- Não reflete diferenças entre análogos (Fiasp vs. Regular vs. NPH)
- Para sistemas de alça fechada, usar obrigatoriamente o **Modelo Exponencial** (Seção 7.3)

#### Modelo de Curva de Walsh
Historicamente utilizado, modela a ação da insulina regular e análoga em curvas não-lineares, usando tabelas de decaimento empíricas.

#### Modelo Exponencial (Oref0 / OpenAPS)
O modelo amplamente adotado em sistemas DIY (OpenAPS, Loop, AndroidAPS). Modela a cinética da insulina usando funções exponenciais de bi-compartimentos.
Parâmetros de pico de ação (tp) e tempo de duração (td).

**Fórmula de Atividade (Insulin Activity - a):**
$$ a(t) = \frac{t}{\tau \cdot tp} \cdot e^{-\frac{t}{\tau}} $$
Onde $\tau = \frac{tp \cdot (1 - \frac{tp}{td})}{1 - \frac{2tp}{td}}$

**Fórmula do IOB (Insulina Restante):**
$$ IOB(t) = Dose \cdot \left(1 - S \cdot \left(1 - e^{-\frac{t}{\tau}} \cdot \left(1 + \frac{t}{\tau} \cdot (1 - \frac{t}{td}) \right) \right)\right) $$
(Equações simplificadas. A formulação Oref0 real utiliza a integral da curva de atividade).

**Pseudocódigo (Base Oref0 simplificada):**
```javascript
function calcularIOBExponencial(dose, minutosPassados, dia_horas, peak_minutos) {
    let td = dia_horas * 60; // Duração em minutos
    let tp = peak_minutos; // Pico em minutos
    let t = minutosPassados;
    
    if (t >= td) return 0;
    
    let tau = tp * (1 - tp / td) / (1 - 2 * tp / td);
    let a = 2 * tau / td;
    let S = 1 / (1 - a + (1 + a) * Math.exp(-td / tau));
    
    let atividade = (S / (tau * tau)) * t * (1 - t / td) * Math.exp(-t / tau);
    
    let iob_restante = dose * (1 - S * (1 - Math.exp(-t / tau) * (1 + (t / tau) * (1 - a / 2)))); // Simplificação

    return { iob: iob_restante, activity: atividade };
}
```
**Referência Bibliográfica:**
- Documentação do OpenAPS (oref0) / LoopKit. Modelos baseados no perfil farmacodinâmico de Fiasp e Novolog.

---

## 8. COB — Carbs on Board (Carboidratos Ativos)

### Definição
Carboidratos ingeridos que ainda não foram convertidos em glicose e absorvidos pela corrente sanguínea. Fundamental para prever a subida da glicemia ("Eventual BG").

### Modelo de Absorção de Carboidratos
Existem modelos estáticos (absorção ao longo de 2, 3 ou 4 horas dependendo do índice glicêmico) e modelos dinâmicos (que observam a glicemia subindo para inferir que os carboidratos estão sendo absorvidos).

#### Curva de Absorção (OpenAPS / Oref0)
A absorção varia dependendo do perfil da refeição. Em modelos simples:
$$ Absorcao\_Minima (g/min) = \frac{Carbs}{Duracao\_Esperada} $$

Se o sistema detecta (via CGM) aumento glicêmico além do coberto pelo IOB negativo (insulin deviation), ele calcula o `carb_absorption_rate`.

**Pseudocódigo (Estimativa Estática Básica):**
```javascript
function estimarCOBLinear(carbsGerais, minutosPassados, indiceGlicemico = 'medio') {
    let duracaoMinutos;
    switch(indiceGlicemico) {
        case 'alto': duracaoMinutos = 120; break;
        case 'medio': duracaoMinutos = 180; break;
        case 'baixo': duracaoMinutos = 240; break;
    }
    
    if (minutosPassados >= duracaoMinutos) return 0;
    
    let taxaAbsorcao = carbsGerais / duracaoMinutos;
    let carbsAbsorvidos = taxaAbsorcao * minutosPassados;
    
    return carbsGerais - carbsAbsorvidos; // COB restante
}
```

---

## 9. Modelos de Sistemas de Alça Fechada (Closed Loop)

Estes algoritmos leem o CGM, calculam IOB e COB, e alteram autonomamente a taxa basal ou aplicam micro-bolus.

### 9.1 Modelo OpenAPS (Oref0 / Oref1)
- **Oref0:** Apenas usa taxa basal temporária (Temp Basal).
- **Oref1:** Introduz o SMB (Super Micro Bolus). Se o paciente está com tendência de subida rápida, o sistema aplica frações de bolus, permitindo correção mais rápida que apenas elevando a basal.

**Cálculo da Glicemia Eventual (Eventual BG):**
A glicemia que o paciente terá quando todo o IOB e COB expirarem (sem interferência).
$$ Eventual\_BG = BG_{atual} - (IOB \times ISF) + \left(\frac{COB}{ICR} \times ISF\right) $$
*Note que $COB/ICR$ é a dose de insulina que cobriria o COB, multiplicando pelo ISF dá o equivalente em glicemia.*

Se $Eventual\_BG < Alvo$, reduz basal.
Se $Eventual\_BG > Alvo$, aumenta basal.

### 9.2 Modelo Loop (iOS)
O Loop usa os conceitos de Efeito de Insulina (IE) e Efeito de Carboidrato (CE), somando os vetores de velocidade ("momentum" da glicose) para prever as próximas curvas. A matemática é focada em minimizar o erro entre a curva prevista e a curva alvo, derivando a dose recomendada (Temp Basal ou Bolus automático).

### 9.3 Modelo AndroidAPS (AAPS)
Implementa Oref0, Oref1 e o módulo AMA (Advanced Meal Assist) e UAM (Unannounced Meals).
O UAM é revolucionário: através da detecção de desvios bruscos e persistentes da glicemia sem registro de carboidratos ou com absorção retardada, o AAPS estima que os carboidratos estão entrando ou há hormônios agindo, inferindo um "COB Fantasma" matematicamente e entregando SMBs para segurar o pico.

---

## 10. Basal Temporária

### Definição
Um ajuste temporário (geralmente por 30 a 120 min) da taxa de insulina contínua basal para cima (para hiperglicemia ou adoecimento) ou para baixo (para exercício ou hipoglicemia prevista).

**Fórmula (Basal Necessária baseada na variação):**
$$ Basal_{req} = Basal_{padrao} + \frac{Dose\_Diferencial}{\Delta t} $$

**Cálculo Oref0 (Temp Basal Requerida para cobrir $Eventual BG$):**
$$ Insulina\_Necessaria = \frac{Eventual\_BG - Target\_BG}{ISF} $$
$$ Taxa\_Basal\_Sugerida = Basal_{atual} + (Insulina\_Necessaria \times \frac{60}{duracao\_min}) $$

**Limites de Segurança:**
- Taxa basal temporária máxima = `max_basal` (geralmente 3x a 5x o basal normal, ou fixada por ex. em 2.0 U/h).
- Zero (0 U/h) se glicemia eventual indicar hipoglicemia severa.

---

## 11. Ajuste por Tendência do CGM

Quando não se utiliza um sistema autônomo (Loop), o paciente injetando bolus manual via caneta ou bomba clássica precisa ajustar pela seta de tendência.

### Método Bergenstal
Usa a taxa de variação ou ROC (Rate of Change) do CGM.
Se $\text{Seta para cima (\uparrow)} \rightarrow +20\%$ no Bolus Total.
Se $\text{Seta dupla para cima (\uparrow\uparrow)} \rightarrow +30\%$ no Bolus Total.
Se $\text{Seta para baixo (\downarrow)} \rightarrow -20\%$ no Bolus Total.
Se $\text{Seta dupla para baixo (\downarrow\downarrow)} \rightarrow -30\%$ no Bolus Total.

**Fórmula de Correção Antecipada (Baseada na Delta):**
$$ Ajuste\_BG = BG_{atual} + (Tendencia (mg/dL/min) \times Tempo\_Impacto (min)) $$
Exemplo: Se o CGM mostra $\uparrow$ (subindo a 2 mg/dL/min), em 30 min (tempo para insulina iniciar pico) a glicemia estará $2 \times 30 = 60$ mg/dL maior. Então, adiciona-se à glicemia atual $60$ mg/dL no cálculo do bolus corretivo.

---

## 12. FPU — Fat-Protein Units (Método Pankowska)

### Definição
Gorduras e proteínas também afetam a glicemia, não em um pico rápido, mas causando resistência insulínica e neoglicogênese atrasada (3 a 8 horas após a refeição).

### Método e Fórmula
1 FPU (Unidade de Gordura/Proteína) = 100 kcal provenientes puramente de Gordura e Proteína.
1 FPU equivale metabolicamente a 10g de carboidratos em termos de necessidade de insulina, porém estendidos no tempo.

**Fórmula:**
$$ Kcal_{P/G} = (Proteinas (g) \times 4) + (Gorduras (g) \times 9) $$
$$ FPU = \frac{Kcal_{P/G}}{100} $$
$$ Insulina\_Extra = FPU \times \frac{10}{ICR} $$

**Estratégia de Bolus (Onda Dupla / Extendida):**
A insulina requerida pela FPU nunca deve ser administrada em bolus imediato normal. Deve ser programada na bomba como um "Bolus Estendido" ou coberta por um aumento na Taxa Basal (Temp Basal) com duração dependendo da carga de FPU:
- 1 FPU: Estender por 3 horas.
- 2 FPU: Estender por 4 horas.
- 3 FPU: Estender por 5 horas.
- >3 FPU: Estender por 8 horas.

**Exemplo:**
Pizza (Alta gordura). 40g de Proteína, 50g de Gordura.
Kcal = (40*4) + (50*9) = 160 + 450 = 610 Kcal.
FPU = 6.1. Equivale a 61g de carboidratos lentos.
Se ICR = 10, extra é de 6.1U. O paciente deve distribuir isso em um bolus prolongado de 8h.

---

## 13. Estimativa de HbA1c (eHbA1c)

A Glicemia Média Estimada (eAG) gerada pelos dados contínuos do CGM (ou medidas de glicosímetro capilar) pode ser convertida na estimativa matemática da Hemoglobina Glicada (HbA1c).

### Equação de Nathan (ADAG Study)
O estudo ADAG (A1c-Derived Average Glucose) estabeleceu a relação direta e linear.

**Fórmula Matemática:**
$$ HbA1c (\%) = \frac{eAG (mg/dL) + 46.7}{28.7} $$

**Para Glicose em mmol/L:**
$$ HbA1c (\%) = \frac{eAG (mmol/L) + 2.59}{1.59} $$

**Pseudocódigo:**
```javascript
function calcularA1cEstimada(mediaGlicemicaMgDl) {
    if (mediaGlicemicaMgDl < 40 || mediaGlicemicaMgDl > 500) {
        throw new Error("Média Glicêmica fora dos limites aceitáveis para estimativa");
    }
    return (mediaGlicemicaMgDl + 46.7) / 28.7;
}
```

**Exemplo:**
Média de glicemia (14 dias do Libre/Dexcom) = 160 mg/dL.
HbA1c = (160 + 46.7) / 28.7 = 206.7 / 28.7 = 7.2%.

**Limitações:**
Variabilidade eritrocitária, anemia, gravidez, doença renal, todos podem descolar o valor real de HbA1c laboratorial da eHbA1c do CGM. Por isso relatórios mais modernos usam o "GMI" (Glucose Management Indicator) que utiliza uma fórmula levemente ajustada.

### GMI (Glucose Management Indicator)
Mais apropriado para usuários modernos de CGM.
$$ GMI (\%) = 3.31 + 0.02392 \times media\_CGM\_mg/dL $$

---

## 14. Fórmulas e Regras de Segurança (Cruciais)

Ao desenvolver sistemas computacionais (seja suporte ou Loop), as regras de segurança são **não-negociáveis**. Uma injeção por erro de software de 20U ao invés de 2.0U é letal.

### Validações de Bordas Críticas
- **Máximo Bolus Único (`max_bolus`):** Todo sistema deve ter um limite hard-coded ou configurado de fábrica (ex: nunca passar de 25U em um clique).
- **Máxima Basal (`max_basal`):** Como vimos na seção de Basal Temporária, limite para não administrar overdose contínua.
- **Divisão por Zero:** `ICR` e `ISF` não podem ser 0.
- **Validação de Intervalo de Glicemia:** Nunca calcular correção sobre valores irreais (ex: CGM lendo 15 mg/dL ou 800 mg/dL sem confirmação capilar). O escopo do sistema deve ignorar leituras fora do intervalo sensato (ex: 39 a 400 mg/dL) ou acionar alarmes e fallback para manual.
- **IOB Máximo (`max_iob`):** Se IOB > `max_iob` configurado para o paciente, suspender toda entrega autônoma e bloquear sugestão de bolus.

**Pseudocódigo Exemplo (Camada de Segurança de Algoritmo de Suporte):**
```javascript
class InsulinSafetyGuard {
    constructor(maxBolus, maxIob, minBgTarget) {
        this.maxBolus = maxBolus; // ex: 10U
        this.maxIob = maxIob;     // ex: 15U
        this.minBgTarget = minBgTarget; // ex: 80 mg/dL
    }

    validateAndCapDose(suggestedDose, currentIob, currentBg) {
        let safeDose = suggestedDose;

        // Regra 1: Evitar Overdose instantânea
        if (safeDose > this.maxBolus) {
            console.warn("Safety Trigger: Bolus Sugerido excedeu Max Bolus. Capando.");
            safeDose = this.maxBolus;
        }

        // Regra 2: Teto de IOB Total (Impedir stack letal)
        if (currentIob + safeDose > this.maxIob) {
            console.warn("Safety Trigger: Limite de IOB atingido.");
            safeDose = Math.max(0, this.maxIob - currentIob);
        }

        // Regra 3: Glicemia muito baixa, trava entrega manual prandial e corretiva
        if (currentBg > 0 && currentBg < 55) {
             console.error("Safety Trigger: Hipoglicemia severa. Bolus cancelado.");
             safeDose = 0;
        }

        return safeDose;
    }
}
```

---
> Fim do Documento. Em conformidade com os princípios da Amanda V4 e a excelência clínica.
