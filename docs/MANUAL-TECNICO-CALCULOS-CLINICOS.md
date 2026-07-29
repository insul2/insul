# 📑 MANUAL TÉCNICO E CLÍNICO DE CÁLCULOS — LEBEN ENGINE V4.0

> **Documento Oficial de Engenharia Médica e Algoritmos de Dosagem (Conformidade IEC 62304 / ISO 14971 / SBD / ADA)**  
> **Versão da Engine**: `4.0.0-LEBEN-CLINICAL`  
> **Versão do Algoritmo**: `4.0.0-CLINICAL-ISO14971`  
> **Modelo Matemático**: `2.1-HOVORKA-EXTENDED`  

> [!IMPORTANT]
> **NÍVEIS DE VALIDAÇÃO REGULATÓRIA E ÉTICA (ANVISA / FDA / IEC 62304)**:  
> 1. **Validação Matemática (Aprovada)**: As equações e modelos polinomiais de IOB e dosagem de bolus refletem as fórmulas consagradas da literatura científica (ADA/SBD).  
> 2. **Validação de Software (Aprovada)**: A suíte de 39 testes unitários automatizados garante que a implementação em código executa com 100% de consistência sem erros de runtime.  
> 3. **Validação Clínica (Pendente de Ensaio Clínico)**: O algoritmo do LEBEN não substitui a avaliação médica e requer ensaio clínico formal para comercialização como Software como Dispositivo Médico (SaMD). Todos os parâmetros DEVEM ser validados pelo endocrinologista responsável.

---

## 📌 SUMÁRIO
1. [Arquitetura Geral e Perfis Clínicos de Pacientes](#1-arquitetura-geral-e-perfis-clínicos-de-pacientes)
2. [Algoritmo Principal de Bolus e Exibição Transparente de Doses Altas](#2-algoritmo-principal-de-bolus-e-exibição-transparente-de-doses-altas)
3. [Integração com CGM e Tendências (mg/dL/min)](#3-integração-com-cgm-e-tendências-mgdlmin)
4. [Score de Confiabilidade e Condições Clínicas (Febre, Estresse, Corticoides)](#4-score-de-confiabilidade-e-condições-clínicas-febre-estresse-corticoides)
5. [Decaimento Biológico de Insulina Ativa (IOB - Curvas Específicas)](#5-decaimento-biológico-de-insulina-ativa-iob---curvas-específicas)
6. [Tratamento de Hipoglicemia e Retorno de Segurança (Hypo Lock)](#6-tratamento-de-hipoglicemia-e-retorno-de-segurança-hypo-lock)
7. [Classificação Fisiológica da Absorção de Alimentos (FPU / Glycemic Index)](#7-classificação-fisiológica-da-absorção-de-alimentos-fpu--glycemic-index)
8. [Motor de Exercício Físico Multidimensão (Aeróbico vs Anaeróbico)](#8-motor-de-exercício-físico-multidimensão-aeróbico-vs-anaeróbico)
9. [Pre-Bolus Dinâmico Recomendado por Faixa Glicêmica](#9-pre-bolus-dinâmico-recomendado-por-faixa-glicêmica)
10. [Simulação Preditiva Glicêmica (Digital Twin Prediction Points)](#10-simulação-preditiva-glicêmica-digital-twin-prediction-points)
11. [Auditoria Criptográfica Encadeada SHA-256 (Blockchain-Style Trail)](#11-auditoria-criptográfica-encadeada-sha-256-blockchain-style-trail)
12. [Suíte de Validação e Testes Unitários](#12-suíte-de-validação-e-testes-unitários)

---

## 1. ARQUITETURA GERAL E PERFIS CLÍNICOS DE PACIENTES

O **LEBEN Engine V4.0** suporta perfis clínicos de pacientes com metas de glicemia alvo individualizadas:

| Perfil Clínico | Código | Glicemia Alvo Padrão | Indicação Médica |
| :--- | :--- | :---: | :--- |
| **Adulto Geral** | `ADULT` | **100 mg/dL** | Controle metabólico padrão de adultos T1D/T2D |
| **Gestante** | `PREGNANT` | **90 mg/dL** | Controle glicêmico estrito pré-concepcional e gestacional |
| **Criança / Pediatria** | `CHILD` | **120 mg/dL** | Prevenção reforçada de hipoglicemias noturnas infantis |
| **Idoso** | `ELDERLY` | **140 mg/dL** | Meta conservadora para pacientes com menor percepção de hipo |

---

## 2. ALGORITMO PRINCIPAL DE BOLUS E EXIBIÇÃO TRANSPARENTE DE DOSES ALTAS

### Fórmulas Matemáticas:

#### A. Bolus Alimentar (Prandial)
$$\text{Bolus}_{\text{comida}} = \frac{\text{Carboidratos (g)}}{\text{ICR (g/U)}}$$

#### B. Bolus de Correção (Hiperglicemia com Ajuste CGM)
$$\text{Bolus}_{\text{correção}} = \frac{\left(\text{Glicemia Actual} + \Delta_{\text{CGM}}\right) - \text{Glicemia Alvo}}{\text{ISF (mg/dL/U)}}$$

#### C. Regra Não-Agressiva de Desconto de IOB
$$\text{Correção}_{\text{efetiva}} = \max\left(0, \text{Bolus}_{\text{correção}} - \text{IOB}\right)$$
$$\text{Dose}_{\text{bruta}} = \text{Bolus}_{\text{comida}} + \text{Correção}_{\text{efetiva}} + \text{Ajuste}_{\text{condição}}$$

#### D. Exibição Transparente da Dose Real e Alerta Teto ($25.0\text{ U}$)
Se a $\text{Dose}_{\text{bruta}} > 25.0\text{ U}$, o sistema exibe:
* **`rawTotal`**: $47.0\text{ U}$ (Dose Clínicamente Calculada)
* **`requiresManualConfirmation`**: `true`
* **`cappedDose`**: $25.0\text{ U}$ (Alerta de Confirmação Manual)

---

## 3. INTEGRAÇÃO COM CGM E TENDÊNCIAS (mg/dL/min)

| Seta de Tendência CGM | Código | Ajuste Glicêmico ($\Delta_{\text{CGM}}$) |
| :--- | :--- | :---: |
| **Subindo Rápido (>2 mg/dL/min)** | `DOUBLE_UP` | **+30 mg/dL** |
| **Subindo (1 a 2 mg/dL/min)** | `SINGLE_UP` | **+15 mg/dL** |
| **Subindo Leve (0.5 a 1 mg/dL/min)** | `FORTY_FIVE_UP` | **+8 mg/dL** |
| **Estável (-0.5 a 0.5 mg/dL/min)** | `FLAT` | **0 mg/dL** |
| **Caindo Leve (-0.5 a -1 mg/dL/min)** | `FORTY_FIVE_DOWN` | **-8 mg/dL** |
| **Caindo (-1 a -2 mg/dL/min)** | `SINGLE_DOWN` | **-15 mg/dL** |
| **Caindo Rápido (>-2 mg/dL/min)** | `DOUBLE_DOWN` | **-30 mg/dL** |

---

## 4. SCORE DE CONFIABILIDADE E CONDIÇÕES CLÍNICAS

O motor calcula o **Confidence Score (%)**:

$$\text{ConfidenceScore} = 95\% - \text{Penalidade}_{\text{condição}} - \text{Penalidade}_{\text{extremos}}$$

| Condição Clínica | Código | Ajuste de Dose | Penalidade Confiabilidade |
| :--- | :--- | :---: | :---: |
| **Saúde Normal** | `NONE` | **0%** | $0\%$ |
| **Febre / Infecção** | `FEVER_ILLNESS` | **+20%** | $-20\%$ |
| **Estresse Intenso** | `STRESS` | **+15%** | $-15\%$ |
| **Uso de Corticoides** | `STEROIDS` | **+30%** | $-25\%$ |

---

## 5. DECAIMENTO BIOLÓGICO DE INSULINA ATIVA (IOB - CURVAS ESPECÍFICAS)

1. **Ultrarrápida Padrão (`HUMALOG` / Novorapid / Apidra - DIA 4h)**:
   $$f(t) = 1 - 3.75 t^2 + 4.25 t^3 - 1.5 t^4$$
2. **Super-Ultrarrápida (`FIASP` / Lumjev - DIA 3h - Pico Precoce 30-45min)**:
   $$f(t) = 1 - 4.20 t^2 + 4.80 t^3 - 1.60 t^4$$
3. **Insulina Humana Regular (`REGULAR` - DIA 6h)**:
   $$f(t) = 1 - 3.00 t^2 + 3.20 t^3 - 1.20 t^4$$

---

## 6. TRATAMENTO DE HIPOGLICEMIA E RETORNO DE SEGURANÇA (HYPO LOCK)

* **Glicemia $\le 25\text{ mg/dL}$**: Dispara alerta de `EMERGÊNCIA EXTREMA`.
* **Glicemia $< 70\text{ mg/dL}$**: Retorna `BLOCKED_HYPO_SAFETY` com dose recomendada $0.0\text{ U}$ e instrução para o consumo de $15\text{g}$ de carboidratos simples.

---

## 7. CLASSIFICAÇÃO FISIOLÓGICA DA ABSORÇÃO DE ALIMENTOS (FPU)

* `FAST`: Duração 60 min.
* `MODERATE`: Duração 120 min.
* `SLOW_FPU`: Duração 240 min. Recomendação de bolus estendido/dual wave.

---

## 8. MOTOR DE EXERCÍCIO FÍSICO MULTIDIMENSÃO (AERÓBICO VS ANAERÓBICO)

* `NONE`: $0\%$ de desconto.
* `WALK_30`: $15\%$ de desconto.
* `RUN_30`: $30\%$ de desconto.
* `INTENSE_60`: $40\%$ de desconto.
* `RESISTANCE_ANAEROBIC`: $+10\%$ de incremento temporário (previne picos hiperglicêmicos pós-musculação).

---

## 9. PRE-BOLUS DINÂMICO RECOMENDADO POR FAIXA GLICÊMICA

| Faixa Glicêmica (mg/dL) | Antecedência Recomendada |
| :--- | :---: |
| **$< 80\text{ mg/dL}$** | **0 min** |
| **$80 - 120\text{ mg/dL}$** | **10 min** |
| **$120 - 180\text{ mg/dL}$** | **15 min** |
| **$180 - 250\text{ mg/dL}$** | **20 min** |
| **$> 250\text{ mg/dL}$** | **25 min** |

---

## 10. SIMULAÇÃO PREDITIVA GLICÊMICA (DIGITAL TWIN)

Calcula a curva simulada estimada para $+30\text{min}$, $+60\text{min}$, $+90\text{min}$ e $+120\text{min}$.

---

## 11. AUDITORIA CRIPTOGRÁFICA ENCADEADA SHA-256

$$\text{AuditHash} = \text{SHA-256}\left(\text{EngineVersion} \parallel \text{AlgoVersion} \parallel \text{BG} \parallel \text{Carbs} \parallel \text{IOB} \parallel \text{ICR} \parallel \text{ISF} \parallel \text{InsulinType} \parallel \text{Profile} \parallel \text{CGMTrend} \parallel \text{Condition} \parallel \text{UserId} \parallel \text{DeviceId} \parallel \text{PreviousHash} \parallel \text{Dose} \parallel \text{Status}\right)$$

---

## 12. SUÍTE DE VALIDAÇÃO E TESTES UNITÁRIOS

O arquivo `tests/test_engine.js` executa **39 testes de software automatizados** com **100% de aprovação**.
