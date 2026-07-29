# 📑 MANUAL TÉCNICO E CLÍNICO DE CÁLCULOS — LEBEN ENGINE V4.0

> **Documento Oficial de Engenharia Médica e Algoritmos de Dosagem (Conformidade IEC 62304 / SBD / ADA)**  
> **Versão da Engine**: V4.0.0-LEBEN-CLINICAL  
> **Versão do Algoritmo**: WILINSKA_HOVORKA_V4  

> [!IMPORTANT]
> **DISCLAIMER REGULATÓRIO E ÉTICO**:  
> O LEBEN Engine utiliza um modelo matemático inspirado em curvas publicadas na literatura científica para estimativa de insulina ativa e dosagem prandial/corretiva. O algoritmo do LEBEN não substitui a avaliação médica e requer validação clínica específica para uso como dispositivo médico (Software as a Medical Device - SaMD). Todos os parâmetros DEVEM ser validados pelo endocrinologista responsável.

---

## 📌 SUMÁRIO
1. [Arquitetura Geral e Perfis Clínicos de Pacientes](#1-arquitetura-geral-e-perfis-clínicos-de-pacientes)
2. [Algoritmo Principal de Bolus e Exibição Transparente de Doses Altas](#2-algoritmo-principal-de-bolus-e-exibição-transparente-de-doses-altas)
3. [Decaimento Biológico de Insulina Ativa (IOB - Curvas Específicas)](#3-decaimento-biológico-de-insulina-ativa-iob---curvas-específicas)
4. [Tratamento de Hipoglicemia e Retorno de Segurança (Hypo Lock)](#4-tratamento-de-hipoglicemia-e-retorno-de-segurança-hypo-lock)
5. [Classificação Fisiológica da Absorção de Alimentos (FPU / Glycemic Index)](#5-classificação-fisiológica-da-absorção-de-alimentos-fpu--glycemic-index)
6. [Motor de Exercício Físico Multidimensão (Aeróbico vs Anaeróbico)](#6-motor-de-exercício-físico-multidimensão-aeróbico-vs-anaeróbico)
7. [Pre-Bolus Dinâmico Recomendado por Faixa Glicêmica](#7-pre-bolus-dinâmico-recomendado-por-faixa-glicêmica)
8. [Simulação Preditiva Glicêmica (Digital Twin Prediction Points)](#8-simulação-preditiva-glicêmica-digital-twin-prediction-points)
9. [Auditoria Criptográfica Encadeada SHA-256 (Blockchain-Style Trail)](#9-auditoria-criptográfica-encadeada-sha-256-blockchain-style-trail)
10. [Suíte de Validação e Testes Unitários](#10-suíte-de-validação-e-testes-unitários)

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

#### B. Bolus de Correção (Hiperglicemia)
$$\text{Bolus}_{\text{correção}} = \frac{\text{Glicemia Actual (mg/dL)} - \text{Glicemia Alvo (mg/dL)}}{\text{ISF (mg/dL/U)}}$$

#### C. Regra Não-Agressiva de Desconto de IOB
$$\text{Correção}_{\text{efetiva}} = \max\left(0, \text{Bolus}_{\text{correção}} - \text{IOB}\right)$$
$$\text{Dose}_{\text{bruta}} = \text{Bolus}_{\text{comida}} + \text{Correção}_{\text{efetiva}}$$

#### D. Exibição Transparente da Dose Real e Alerta Teto ($25.0\text{ U}$)
Se a $\text{Dose}_{\text{bruta}} > 25.0\text{ U}$ (ex: $47.0\text{ U}$ para paciente resistente), o sistema **NÃO esconde a dose clínica real**. Ele exibe:
* **`rawTotal`**: $47.0\text{ U}$ (Dose Clínicamente Necessária)
* **`requiresManualConfirmation`**: `true`
* **`cappedDose`**: $25.0\text{ U}$ (Alerta de Confirmação Manual)

#### E. Arredondamento Configurável (`roundingStep` / `doseIncrement`)
$$\text{Dose}_{\text{final}} = \text{round}\left(\frac{\text{Dose}_{\text{ajustada}}}{\text{Incremento}}\right) \times \text{Incremento}$$
* **`0.5 U`**: Canetas convencionais
* **`0.1 U`**: Bombas de insulina pediátricas
* **`0.05 U`**: Micro-dosagem de alta precisão

---

## 3. DECAIMENTO BIOLÓGICO DE INSULINA ATIVA (IOB - CURVAS ESPECÍFICAS)

O sistema implementa curvas de farmacocinética específicas por classe de insulina:

### Curvas por Tipo de Insulina:
1. **Ultrarrápida Padrão (`HUMALOG` / Novorapid / Apidra - DIA 4h)**:
   $$f(t) = 1 - 3.75 t^2 + 4.25 t^3 - 1.5 t^4$$
2. **Super-Ultrarrápida (`FIASP` / Lumjev - DIA 3h - Pico Precoce 30-45min)**:
   $$f(t) = 1 - 4.20 t^2 + 4.80 t^3 - 1.60 t^4$$
3. **Insulina Humana Regular (`REGULAR` - DIA 6h)**:
   $$f(t) = 1 - 3.00 t^2 + 3.20 t^3 - 1.20 t^4$$

---

## 4. TRATAMENTO DE HIPOGLICEMIA E RETORNO DE SEGURANÇA (HYPO LOCK)

Se $\text{Glicemia} < 70\text{ mg/dL}$, o motor retorna:
* **Status**: `BLOCKED_HYPO_SAFETY`
* **Dose Recomendada**: $0.0\text{ U}$
* **Mensagem**: *"Aplicação bloqueada temporariamente. Tratar hipoglicemia imediatamente com 15g de carboidrato simples e recalcular após nova medição."*

---

## 5. CLASSIFICAÇÃO FISIOLÓGICA DA ABSORÇÃO DE ALIMENTOS (FPU / GLYCEMIC INDEX)

* **`FAST` (Absorção Rápida - Sucos, Doces)**: Duração 60 min.
* **`MODERATE` (Absorção Normal - Arroz, Pão)**: Duração 120 min.
* **`SLOW_FPU` (Absorção Lenta / FPU - Pizza, Gordura + Proteína)**: Duração 240 min. Recomendação de fracionamento de dose (Bolus Estendido / Dual Wave).

---

## 6. MOTOR DE EXERCÍCIO FÍSICO MULTIDIMENSÃO (AERÓBICO VS ANAERÓBICO)

* **`NONE`**: $0\%$ de desconto.
* **`WALK_30` (Caminhada leve 30 min)**: $15\%$ de desconto.
* **`RUN_30` (Corrida / Aeróbico 30 min)**: $30\%$ de desconto.
* **`INTENSE_60` (Treino aeróbico intenso 60 min)**: $40\%$ de desconto.
* **`RESISTANCE_ANAEROBIC` (Musculação / HIIT - Anaeróbico)**: $+10\%$ de incremento temporário (previne picos hiperglicêmicos causados por adrenalina/cortisol pós-musculação).

---

## 7. PRE-BOLUS DINÂMICO RECOMENDADO POR FAIXA GLICÊMICA

| Faixa Glicêmica (mg/dL) | Tempo de Antecedência Recomendado | Orientação Clínica |
| :--- | :---: | :--- |
| **$< 80\text{ mg/dL}$** | **0 min** | Não antecipar. Aplicar junto ou logo após a refeição. |
| **$80 - 120\text{ mg/dL}$** | **10 min** | Pré-bolus ideal de 10 minutos. |
| **$120 - 180\text{ mg/dL}$** | **15 min** | Pré-bolus ideal de 15 minutos. |
| **$180 - 250\text{ mg/dL}$** | **20 min** | Pré-bolus recomendado de 20 minutos. |
| **$> 250\text{ mg/dL}$** | **25 min** | Pré-bolus de 25 minutos para aguardar início da ação. |

---

## 8. SIMULAÇÃO PREDITIVA GLICÊMICA (DIGITAL TWIN PREDICTION POINTS)

O motor calcula 4 pontos preditivos de curva glicêmica projetada para $+30\text{min}$, $+60\text{min}$, $+90\text{min}$ e $+120\text{min}$ combinando o decaimento $IOB(t)$ com a curva de absorção prandial.

---

## 9. AUDITORIA CRIPTOGRÁFICA ENCADEADA SHA-256 (BLOCKCHAIN-STYLE TRAIL)

Cada recomendação calcula uma hash criptográfica de 64 caracteres encadeada com o registro anterior:
$$\text{AuditHash} = \text{SHA-256}\left(\text{EngineVersion} \parallel \text{AlgoVersion} \parallel \text{BG} \parallel \text{Carbs} \parallel \text{IOB} \parallel \text{ICR} \parallel \text{ISF} \parallel \text{InsulinType} \parallel \text{Profile} \parallel \text{UserId} \parallel \text{DeviceId} \parallel \text{PreviousHash} \parallel \text{Dose} \parallel \text{Status}\right)$$

---

## 10. SUÍTE DE VALIDAÇÃO E TESTES UNITÁRIOS

O arquivo `tests/test_engine.js` executa **36 testes clínicos automatizados** com **100% de aprovação**.
