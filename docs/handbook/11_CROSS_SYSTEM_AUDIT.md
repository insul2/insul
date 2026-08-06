# LEBEN Engineering Handbook — Volume 11: Cross-System Verification & Consistency Audit (Fase 4)

**Auditor:** Principal Software Engineer, Systems Architect & Lead Clinical Auditor  
**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus (v4.0.0)  
**Data:** 06 de Agosto de 2026  
**Método:** Engenharia Reversa Cruzada (Frontend ↔ Backend ↔ Banco ↔ Documentação ↔ Motor Clínico)  

---

## Objetivo desta Fase

Esta fase deixa a análise isolada de arquivos e realiza a **verificação de consistência de ponta a ponta**: cruzar cada documento clínico com cada arquivo de código, verificar se parâmetros enviados pelo frontend chegam realmente ao cálculo, confirmar se dados persistidos são efetivamente utilizados e identificar código "fantasma" — implementado mas nunca chamado, ou documentado mas nunca implementado.

---

## 1. Matriz de Rastreabilidade Clínica Completa

A matriz rastreia a jornada de cada regra clínica e parâmetro desde a especificação nos manuais até a renderização na interface do usuário.

| Regra / Parâmetro Clínico | Documento Especificador | Endpoint REST | Controller Backend | Motor Clínico | Tabela / Coluna DB | Componente UI | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Trava de Hipoglicemia (<70 mg/dL)** | [`03-algoritmos-matematicos.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/03-algoritmos-matematicos.md) | `POST /bolus/calculate` | `bolusController.js` | `safety.js:L52`, `bolus.js:L85` | `bolus_logs.recommended_dose` | `BolusCalculatorPage.jsx` | 🟢 Completo |
| **Dose Prandial (Carbs / ICR)** | [`03-algoritmos-matematicos.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/03-algoritmos-matematicos.md) | `POST /bolus/calculate` | `bolusController.js` | `bolus.js:L105` | `bolus_logs.carbs_g` | `BolusCalculatorPage.jsx` | 🟢 Completo |
| **Tendência CGM (Offsets mg/dL)** | [`11-cgm-sensores.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/11-cgm-sensores.md) | `POST /bolus/calculate` | `bolusController.js` | `bolus.js:L19-26` | ❌ Não persistido | `BolusCalculatorPage.jsx` | 🟡 Parcial |
| **FPU (Gordura/Proteína - Pankowska)** | [`04-contagem-carboidratos.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/04-contagem-carboidratos.md) | `POST /bolus/calculate` | `bolusController.js` | ❌ **IGNORADO** | `Meal.fpuFatGrams` (sem uso) | `BolusCalculatorPage.jsx` | 🔴 **QUEBRADO** |
| **Meta de Glicemia (`targetGlucose`)** | [`03-algoritmos-matematicos.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/03-algoritmos-matematicos.md) | `POST /bolus/calculate` | `bolusController.js` | ❌ **BUG DE MAPEAMENTO** | `Patient.targetGlucose` | `BolusCalculatorPage.jsx` | 🔴 **QUEBRADO** |
| **DIA Personalizado do Paciente** | [`09-iob-insulina-ativa.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/09-iob-insulina-ativa.md) | `POST /bolus/calculate` | `bolusController.js` | ❌ **VALOR ESTÁTICO EM `iob.js`** | `Patient.diaHours` (sem uso) | `BolusCalculatorPage.jsx` | 🔴 **QUEBRADO** |
| **Duração do Exercício (minutos)** | [`08-exercicio-fisico.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/08-exercicio-fisico.md) | `POST /bolus/calculate` | `bolusController.js` | ❌ **FATOR ESTÁTICO** | ❌ Não persistido | `BolusCalculatorPage.jsx` | 🔴 **QUEBRADO** |
| **Assinatura SHA-256 (Imutabilidade)** | [`12-seguranca-validacao.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/12-seguranca-validacao.md) | `POST /bolus/calculate` | `bolusController.js` | `bolus.js:L218` | `bolus_logs.audit_hash` | `BolusCalculatorPage.jsx` | 🟢 Completo |
| **Score de Confiabilidade (%)** | [`15-motor-matematico.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/15-motor-matematico.md) | `POST /bolus/calculate` | `bolusController.js` | `bolus.js:L149-153` | ❌ Não persistido | `BolusCalculatorPage.jsx` | 🟡 Parcial |
| **Pré-Bolus Timing (minutos)** | [`03-algoritmos-matematicos.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/03-algoritmos-matematicos.md) | `POST /bolus/calculate` | `bolusController.js` | `bolus.js:L156` | ❌ Não persistido | `BolusCalculatorPage.jsx` | 🟡 Parcial |
| **TIR / GMI / CV% (Relatórios)** | [`05-estatisticas-clinicas.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/05-estatisticas-clinicas.md) | `GET /glucose` | `glucoseController.js` | Calculado no Frontend | `glucose_readings` | `ReportsPage.jsx` | 🟡 Parcial (só no Client) |
| **eAG (Equação de Nathan)** | [`05-estatisticas-clinicas.md`](file:///c:/Users/Well/Desktop/projetoinsu/docs/05-estatisticas-clinicas.md#L35) | `GET /glucose` | `glucoseController.js` | ❌ **Não implementado** | — | `ReportsPage.jsx` | 🔴 **AUSENTE** |
| **Perfis Circadianos (ICR/ISF por Horário)** | [`03-algoritmos-matematicos.md:L65`](file:///c:/Users/Well/Desktop/projetoinsu/docs/03-algoritmos-matematicos.md#L65) | `POST /bolus/calculate` | `bolusController.js` | `PATIENT_PROFILES` (fixos) | `InsulinProfile` (sem uso) | `BolusCalculatorPage.jsx` | 🔴 **QUEBRADO** |

---

## 2. Achados de Inconsistências Cross-System (Evidências Completas)

### 🔴 CROSS-01: Desconexão Fatal de `targetGlucose` entre Controller e Engine

**Arquivos Afetados:**
- [`backend/src/controllers/bolusController.js:L10`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/bolusController.js#L10)
- [`backend/src/core/glucose_engine/insulin_math/bolus.js:L80`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L80)

**Evidência no Código:**

O controller normaliza o payload de entrada criando a propriedade `targetGlucose`:
```javascript
// bolusController.js:L10
const normalizedInput = {
  ...rawInput,
  glucose: rawInput.glucose ?? rawInput.currentGlucose,
  carbs: rawInput.carbs ?? rawInput.carbsGrams,
  targetGlucose: rawInput.targetGlucose ?? rawInput.target  // ← Renomeado!
};
```

O motor lê `params.target`, que não existe (ficou `undefined`):
```javascript
// bolus.js:L80
const target = Number(params.target || patientProfile.targetGlucose || 100);
//                    ^^^^^^^^^^^^ = undefined
//                                 ↓
//                           Cai para hardcoded 100 mg/dL!
```

**Impacto Clínico:** Mesmo que o médico configure o alvo para 140 mg/dL (idoso) ou 90 mg/dL (gestante), o motor sempre calcula a correção com meta de 100 mg/dL. Isso gera superdosagem de 1.0U a 2.0U por cálculo em pacientes idosos ou de risco elevado.

**Correção:**
```javascript
// bolus.js:L80 — Corrigir para aceitar ambos os nomes:
const target = Number(params.target ?? params.targetGlucose ?? patientProfile.targetGlucose ?? 100);
```

---

### 🔴 CROSS-02: Incompatibilidade Total entre Migração SQL e Schema Prisma

**Arquivos Afetados:**
- [`backend/prisma/schema.prisma:L91-L107`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L91-L107)
- [`backend/src/config/migrate.js:L49-L59`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/migrate.js#L49-L59)

**Evidência no Código:**

O Prisma define o modelo `BolusEvent` com colunas em `camelCase`:
```prisma
// schema.prisma:L91
model BolusEvent {
  id                String  @id @default(uuid())
  patientId         String
  glucoseMgDl       Int
  carbsGrams        Float
  iobUsed           Float
  recommendedDose   Float
  rawTotal          Float
  ...
```

O script de migração cria a tabela `bolus_logs` com colunas em `snake_case` totalmente diferentes:
```javascript
// migrate.js:L49
await query(`
  CREATE TABLE IF NOT EXISTS bolus_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,        -- ≠ patientId
    recommended_dose NUMERIC(5,2),       -- ≠ recommendedDose
    glucose_mg_dl NUMERIC(5,2),          -- ≠ glucoseMgDl
    carbs_g NUMERIC(5,2),                -- ≠ carbsGrams
    bolus_type VARCHAR(128),             -- coluna inexistente no Prisma
    audit_hash VARCHAR(64)               -- coluna inexistente no Prisma
  );
`);
```

**Impacto de Engenharia:** Quando qualquer desenvolvedor invocar `prisma.bolusEvent.create()`, receberá o erro fatal:
```
PrismaClientKnownRequestError: Table 'BolusEvent' does not exist
```

---

### 🔴 CROSS-03: DIA Personalizado do Paciente Ignorado pelo Motor IOB

**Arquivos Afetados:**
- [`backend/prisma/schema.prisma:L44`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L44)
- [`backend/src/core/glucose_engine/iob_engine/iob.js:L30-L39`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/iob_engine/iob.js#L30-L39)

**Evidência no Código:**

O banco armazena a Duração de Ação personalizada do paciente:
```prisma
model Patient {
  diaHours    Float    @default(4.0)  // ← Configurável pelo médico
```

O motor IOB ignora completamente esse campo e usa valores estáticos por tipo de insulina:
```javascript
// iob.js:L30
let diaHours = 4.0; // ← HARDCODED!
if (type === 'FIASP' || type === 'LUMJEV') {
  diaHours = 3.0;   // ← HARDCODED!
} else if (type === 'REGULAR') {
  diaHours = 6.0;   // ← HARDCODED!
}
// O params.diaHours do paciente nunca é passado para esta função!
```

**Impacto Clínico:** Pacientes com caimento metabólico lento (DIA de 5h) têm sua insulina ativa subestimada. O motor pensa que a dose anterior se esgotou em 4h quando na realidade ainda há 20–30% de insulina ativa. Isso leva a empilhamento e hipoglicemia.

---

### 🔴 CROSS-04: Tabela `InsulinProfile` no Banco Nunca é Consultada pelo Motor

**Arquivos Afetados:**
- [`backend/prisma/schema.prisma:L57-L68`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L57-L68)
- [`frontend/src/pages/Bolus/BolusCalculatorPage.jsx:L10-L20`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx#L10-L20)

**Evidência no Código:**

O Prisma define o modelo `InsulinProfile` para armazenar perfis circadianos por horário:
```prisma
model InsulinProfile {
  startHour   Int      // 0 a 23
  icr         Float    // ICR configurado pelo médico
  isf         Float    // ISF configurado pelo médico
```

No entanto, o frontend usa perfis circadianos **hardcoded estáticos** sem nenhuma chamada ao banco:
```javascript
// BolusCalculatorPage.jsx:L10-L14
const circadianProfiles = [
  { name: '🌅 Café da Manhã', startHour: 6, endHour: 11, icr: 9, isf: 32 },  // ← HARDCODED
  { name: '☀️ Almoço / Tarde', startHour: 12, endHour: 17, icr: 13, isf: 42 }, // ← HARDCODED
  { name: '🌙 Jantar', startHour: 18, endHour: 23, icr: 11, isf: 38 },        // ← HARDCODED
  { name: '🌌 Madrugada', startHour: 0, endHour: 5, icr: 17, isf: 55 },      // ← HARDCODED
];
```

**Impacto Clínico:** A tabela `InsulinProfile` existe no banco mas é totalmente inútil. Nenhum endpoint a lê, nenhuma tela a gerencia, nenhum motor a consome. Os perfis de ICR e ISF usados nos cálculos são iguais para todos os pacientes do sistema.

---

### 🔴 CROSS-05: Conflito de Interação Multi-Fatorial Não-Linear (Febre + Exercício)

**Arquivo Afetado:**
- [`backend/src/core/glucose_engine/insulin_math/bolus.js:L124-L132`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L124-L132)

**Evidência no Código:**
```javascript
// Passo 1: Aplica acréscimo por condição clínica
const conditionAdjustment = rawTotal > 0 ? rawTotal * condMod.doseModifier : 0;
rawTotal += conditionAdjustment; // Ex: rawTotal passa de 5.0U para 6.0U (+20% febre)

// Passo 2: Aplica desconto de exercício SOBRE o total já inflado
const exerciseDiscount = rawTotal > 0 ? rawTotal * exerciseMod.discountFactor : 0;
rawTotal -= exerciseDiscount;    // 6.0U × 30% = 1.8U descontados
// Resultado: 4.2U (mas o correto seria 5.0U × (1+0.20) × (1-0.30) = 4.2U)
```

**Análise Fisiológica:** Coincidentemente, o resultado matemático é o mesmo independente da ordem. O bug real aqui é **semântico**: o desconto de exercício está sendo calculado sobre a dose inflada pela resistência à insulina por febre. Na fisiologia real, a sensibilidade muscular a insulina durante exercício é um mecanismo independente da resistência hormonal por cortisol. Portanto, para febre severa + exercício intenso, a dose final calculada é subótima.

---

## 3. Código Fantasma — Implementado mas Nunca Chamado

| Componente | Localização | Evidência | Status |
| :--- | :--- | :--- | :--- |
| `AIService.analyzeMeal()` | [`backend/src/services/aiService.js:L11`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/services/aiService.js#L11) | Método completo com mock de resposta. Nenhuma rota ou controller o invoca. | 💀 Código Fantasma |
| `AIService.generateHabitInsights()` | [`backend/src/services/aiService.js:L29`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/services/aiService.js#L29) | Idem. Nunca chamado. | 💀 Código Fantasma |
| `Patient.weightKg` / `Patient.heightCm` | [`schema.prisma:L39-L40`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L39) | Colunas existem no banco, nenhum endpoint as lê ou as utiliza nos cálculos. | 💀 Colunas Fantasma |
| `InsulinProfile` (tabela inteira) | [`schema.prisma:L57-L68`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L57-L68) | Tabela com 4 campos, nenhum endpoint a consulta. ICR/ISF são hardcoded no frontend. | 💀 Tabela Fantasma |
| `MEAL_ABSORPTION_TYPES.splitRecommended` | [`bolus.js:L38`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L38) | O campo `splitRecommended: true` existe nos objetos mas nunca altera o cálculo. | 💀 Propriedade Fantasma |
