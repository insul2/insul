# 📑 MANUAL TÉCNICO E CLÍNICO DE CÁLCULOS — LEBEN ENGINE V4.0

> **Documento Oficial de Engenharia Médica e Algoritmos de Dosagem**  
> **Conformidade**: SBD (Sociedade Brasileira de Diabetes), ADA (American Diabetes Association), ISPAD e IEC 62304.  
> **Versão da API**: V4.0.0  

---

## 📌 SUMÁRIO
1. [Visão Geral e Princípios Clínicos](#1-visão-geral-e-princípios-clínicos)
2. [Algoritmo Principal de Bolus (Prandial + Correção)](#2-algoritmo-principal-de-bolus-prandial--correção)
3. [Decaimento Biológico de Insulina Ativa (IOB - Modelo Polinomial)](#3-decaimento-biológico-de-insulina-ativa-iob---modelo-polinomial)
4. [Regras de Estimação de ICR e ISF (Regras 500 / 1800 & Peso Corporal)](#4-regras-de-estimação-de-icr-e-isf-regras-500--1800--peso-corporal)
5. [Trava Clínico-Segura em Hipoglicemia (Hypo Lock)](#5-trava-clínico-segura-em-hipoglicemia-hypo-lock)
6. [Mecanismo de Desconto por Exercício Físico](#6-mecanismo-de-desconto-por-exercício-físico)
7. [Motor de Aplicação Antecipada (Pre-Bolus Timing)](#7-motor-de-aplicação-antecipada-pre-bolus-timing)
8. [Auditoria Criptográfica SHA-256 e Imutabilidade](#8-auditoria-criptográfica-sha-256-e-imutabilidade)
9. [Suíte de Validação e Testes Unitários](#9-suíte-de-validação-e-testes-unitários)

---

## 1. VISÃO GERAL E PRINCÍPIOS CLÍNICOS

O **LEBEN Engine V4.0** é um motor de decisão clínica projetado para calcular a dosagem exata de insulina ultrarrápida ou rápida para pacientes com Diabetes Mellitus Tipo 1 e Tipo 2 insulinodependentes.

### Princípios Fundamentais:
* **Prevenção Rígida de Hipoglicemia**: A segurança do paciente se sobrepõe a qualquer cálculo prandial.
* **Agnosticismo de Insulina**: Suporta insulinas ultrarrápidas (*Humalog, Novorapid, Apidra*), super-ultrarrápidas (*Fiasp, Lumjev*) e humanas (*Regular*).
* **Desconto de IOB Não-Agressivo**: A insulina ativa ($IOB$) é descontada **apenas da dose de correção** para evitar hiperglicemia de rebote.

---

## 2. ALGORITMO PRINCIPAL DE BOLUS (PRANDIAL + CORREÇÃO)

O cálculo da dose total recomendada combina a dose prandial (para os alimentos), a dose de correção (para baixar a glicemia) e os ajustes de segurança.

### Fórmulas Matemáticas:

#### A. Bolus Alimentar (Prandial)
$$\text{Bolus}_{\text{comida}} = \frac{\text{Carboidratos (g)}}{\text{ICR (g/U)}}$$
* **Carboidratos**: Quantidade total de carboidratos em gramas ($g$).
* **ICR (Insulin-to-Carb Ratio)**: Quantos gramas de carboidrato 1 Unidade de insulina cobre.

#### B. Bolus de Correção (Hiperglicemia)
$$\text{Bolus}_{\text{correção}} = \frac{\text{Glicemia Actual (mg/dL)} - \text{Glicemia Alvo (mg/dL)}}{\text{ISF (mg/dL/U)}}$$
* **Glicemia Alvo Padrão**: $100\text{ mg/dL}$ (trava de segurança entre $70\text{ mg/dL}$ e $180\text{ mg/dL}$).
* **ISF (Insulin Sensitivity Factor)**: Quantos mg/dL a glicemia cai com 1 Unidade de insulina.

#### C. Regra de Desconto de Insulina Ativa ($IOB$)
$$\text{Correção}_{\text{efetiva}} = \max\left(0, \text{Bolus}_{\text{correção}} - \text{IOB}\right)$$
$$\text{Dose}_{\text{bruta}} = \text{Bolus}_{\text{comida}} + \text{Correção}_{\text{efetiva}}$$

#### D. Desconto de Exercício Físico
$$\text{Dose}_{\text{ajustada}} = \text{Dose}_{\text{bruta}} \times \left(1 - \text{Fator}_{\text{exercício}}\right)$$

#### E. Arredondamento e Teto de Segurança
$$\text{Dose}_{\text{final}} = \min\left(25.0\text{ U}, \text{round}\left(\frac{\text{Dose}_{\text{ajustada}}}{0.5}\right) \times 0.5\right)$$
* **Incremento**: $0.5\text{ U}$ (meia unidade).
* **Limite Máximo**: $25.0\text{ U}$ por aplicação única.

---

## 3. DECAIMENTO BIOLÓGICO DE INSULINA ATIVA (IOB - MODELO POLINOMIAL)

Para calcular a insulina restante no corpo ($IOB$), utiliza-se a curva polinomial de 4º grau de Hovorka/Wilinska:

### Equação Polinomial:
Seja $t = \frac{\text{Tempo Decorrido (min)}}{\text{DIA (min)}}$ onde $t \in [0, 1]$:

$$f_{\text{IOB}}(t) = 1 - 3.75 \cdot t^2 + 4.25 \cdot t^3 - 1.5 \cdot t^4$$

$$\text{IOB Remanescente (U)} = \text{Dose Aplicada (U)} \times f_{\text{IOB}}(t)$$

### Duração da Ação da Insulina (DIA):
* **`HUMALOG` / Novorapid / Apidra**: $\text{DIA} = 4.0\text{ horas (240 min)}$
* **`FIASP` / Lumjev**: $\text{DIA} = 3.0\text{ horas (180 min)}$
* **`REGULAR`**: $\text{DIA} = 6.0\text{ horas (360 min)}$

---

## 4. REGRAS DE ESTIMAÇÃO DE ICR E ISF (REGRAS 500 / 1800 & PESO CORPORAL)

### A. Regras Clássicas (Pela Dose Total Diária - DTT):
$$\text{ICR (g/U)} = \frac{500}{\text{DTT (U/dia)}}$$

$$\text{ISF (mg/dL/U)} = \frac{1800}{\text{DTT (U/dia)}}$$

### B. Modelo por Peso Corporal (Para Novatos Sem Médico):
Utiliza a constante de sensibilidade inicial fisiológica de $0.55\text{ U/kg}$:
$$\text{DTT}_{\text{estimada}} = \text{Peso (kg)} \times 0.55\text{ U/kg}$$

$$\text{ICR} = \frac{500}{\text{Peso} \times 0.55} \qquad \text{e} \qquad \text{ISF} = \frac{1800}{\text{Peso} \times 0.55}$$

* **Exemplo para 70 kg**:
  * $\text{DTT} = 70 \times 0.55 = 38.5\text{ U/dia}$
  * $\text{ICR} = \frac{500}{38.5} = \mathbf{13.0\text{ g/U}}$
  * $\text{ISF} = \frac{1800}{38.5} = \mathbf{47.0\text{ mg/dL/U}}$

---

## 5. TRAVA CLÍNICO-SEGURA EM HIPOGLICEMIA (HYPO LOCK)

* **Glicemia Limite**: $< 70\text{ mg/dL}$.
* **Regra Absoluta**:
  $$\text{Se Glicemia} < 70\text{ mg/dL} \Longrightarrow \text{Dose Recomendada} = \mathbf{0.0\text{ U}}$$
* **Ação Recomendada**: Ingestão de $15\text{g}$ a $20\text{g}$ de carboidratos rápidos (Regra dos 15 min).

---

## 6. MECANISMO DE DESCONTO POR EXERCÍCIO FÍSICO

| Modalidade | Código | Desconto | Multiplicador |
| :--- | :--- | :---: | :---: |
| **Repouso / Sem Exercício** | `NONE` | **0%** | $1.00$ |
| **Caminhada Leve (30 min)** | `WALK_30` | **15%** | $0.85$ |
| **Exercício Moderado / Corrida (30 min)** | `RUN_30` | **30%** | $0.70$ |
| **Treino Intenso (60 min)** | `INTENSE_60` | **40%** | $0.60$ |

---

## 7. MOTOR DE APLICAÇÃO ANTECIPADA (PRE-BOLUS TIMING)

Calcula o efeito da aplicação de insulina feita com antecedência ($15\text{min}, 30\text{min}, 60\text{min}, 120\text{min}$) em relação à refeição:

* **Pico da Insulina**: Otimiza a coincidência do pico insulínico com a curva de absorção glicêmica.
* **Alerta de Risco ($>30\text{ min}$)**: Avisa o paciente sobre o risco de queda glicêmica precoce antes da comida ser absorvida.

---

## 8. AUDITORIA CRIPTOGRÁFICA SHA-256 E IMUTABILIDADE

Cada recomendação gera uma hash de auditoria imutável de 64 caracteres:
$$\text{AuditHash} = \text{SHA-256}\left(\text{glicemia} \parallel \text{carbs} \parallel \text{iob} \parallel \text{icr} \parallel \text{isf} \parallel \text{dose} \parallel \text{secret}\right)$$

---

## 9. SUÍTE DE VALIDAÇÃO E TESTES UNITÁRIOS

O arquivo `tests/test_engine.js` executa **35 testes clínicos automatizados** cobrindo todas as fórmulas acima com **100% de aprovação**.
