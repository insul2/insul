# 📊 Módulo de Estatísticas Clínicas & Métricas Avançadas (Insul / Amanda V4)

Esta documentação descreve o funcionamento do motor de estatísticas clínicas do **Insul**, implementado no banco de dados através da **Migration 008** (`008_glycemic_statistics_module.sql`), em conformidade com as diretrizes internacionais da **ADA (American Diabetes Association 2024)**, **ISPAD (2022)** e **SBD (2024)**.

---

## 📐 Estrutura de Métricas do Banco de Dados

### 1. 🎯 Tempo na Faixa (TIR — Time in Range)
Mede a porcentagem de tempo em que a glicemia permaneceu dentro da meta recomendada (70 a 180 mg/dL).

- **`tir_pct` (Meta >70%):** Porcentagem de leituras entre **70 e 180 mg/dL**.
- **`tbr_level1_pct` (TBR Nível 1 - Meta <4%):** Porcentagem em hipoglicemia leve (**54 a 69 mg/dL**).
- **`tbr_level2_pct` (TBR Nível 2 - Meta <1%):** Porcentagem em hipoglicemia grave (**<54 mg/dL**).
- **`tar_level1_pct` (TAR Nível 1 - Meta <25%):** Porcentagem em hiperglicemia leve (**181 a 250 mg/dL**).
- **`tar_level2_pct` (TAR Nível 2 - Meta <5%):** Porcentagem em hiperglicemia grave (**>250 mg/dL**).

---

### 2. 📉 Variabilidade Glicêmica & Estabilidade
Avalia a oscilação da glicemia ao longo do dia para evitar hipoglicemias assintomáticas.

- **`standard_deviation` (SD):** Desvio padrão das leituras.
- **`coefficient_of_variation` (CV% - Meta $\le$ 36%):** Coeficiente de Variação percentual:
  $$\text{CV\%} = \left( \frac{\text{Desvio Padrão}}{\text{Média Glicêmica}} \right) \times 100$$
  - *Interpretação*: Um $\text{CV\%} \le 36\%$ indica uma glicemia **estável**, enquanto $\text{CV\%} > 36\%$ sinaliza alta variabilidade e risco de hipoglicemia.

---

### 3. 🧪 Estimativa de HbA1c (GMI & eAG)
Fornece ao paciente e ao endocrinologista uma estimativa precisa da hemoglobina glicada baseada no monitoramento contínuo.

- **`gmi_pct` (Glucose Management Indicator):** Fórmula padronizada ADA/Bergenstal:
  $$\text{GMI (\%)} = 3,31 + (0,02392 \times \text{Média Glicêmica em mg/dL})$$
- **`eag_mg_dl` (Glicemia Média Estimada - Equação de Nathan):**
  $$\text{eAG (mg/dL)} = (28,7 \times \text{HbA1c}) - 46,7$$

---

### 4. ⏰ Médias por Horário do Dia & Refeições
Identifica janelas de resistência ou sensibilidade circadiana ao longo do dia.

- **`avg_fasting_mg_dl`**: Média do jejum/madrugada (04:00 - 08:00).
- **`avg_morning_mg_dl`**: Média da manhã (08:00 - 12:00).
- **`avg_afternoon_mg_dl`**: Média da tarde (12:00 - 18:00).
- **`avg_night_mg_dl`**: Média da noite (18:00 - 04:00).
- **Médias Pré e Pós-Prandiais**: Cruzamento automático das leituras de glicemia capturadas nos intervalos de **0 a 30 min antes** e **1,5h a 2h após** o registro de café, almoço e jantar.

---

## 🛠️ Stored Procedure de Cálculo Automático

O cálculo de estatísticas é processado automaticamente no MySQL através da stored procedure:

```sql
CALL sp_calculate_patient_statistics(
    'uuid-do-paciente',
    '2026-07-01', -- Início do período
    '2026-07-28', -- Fim do período
    'MONTHLY'     -- Perfil (DAILY, WEEKLY, MONTHLY)
);
```

As estatísticas calculadas ficam gravadas na tabela **`patient_glycemic_statistics`** e são renderizadas diretamente nos gráficos da Dashboard e no **relatório em PDF enviado ao médico**.
