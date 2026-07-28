# Banco de Dados — ProjetoInsu (MySQL 8.0+)
## App Pessoal de Cálculo de Bolus de Insulina

## Diagrama de Relacionamento (ERD)

```
users (1 conta = 1 diabético)
  │
  └──── patients  (perfil: nome, peso, altura, tipo de DM, dispositivo)
            │
            ├──── patient_insulins        ← "Que insulinas você toma?"
            │       (basal: Lantus, Tresiba | bolus: NovoRapid, Humalog)
            │
            ├──── patient_medications     ← "Que outros remédios você toma?"
            │       (Metformina, Jardiance, Ozempic, etc.)
            │
            ├──── patient_health_metrics  ← "Registre seus exames"
            │       (HbA1c, pressão, colesterol, peso ao longo do tempo)
            │
            ├──── patient_comorbidities   ← "Outras condições de saúde"
            │       (Hipertensão, hipotireoidismo, gastroparesia, etc.)
            │
            ├──── insulin_profiles        ← "Seus parâmetros de cálculo"
            │         └── insulin_profile_segments
            │               (ICR + ISF + Alvo por horário do dia)
            │
            ├──── glucose_readings        ← Leituras de glicemia (CGM/capilar)
            │
            ├──── meals                   ← Refeições registradas + macros
            │         └── bolus_events    ← Cada cálculo de dose feito no app
            │
            ├──── exercise_events         ← Atividades físicas
            │
            ├──── alerts                  ← Avisos automáticos do app
            │
            └──── meal_templates          ← Suas refeições favoritas salvas

food_database  (banco global de alimentos TACO + USDA)
audit_log      (histórico de alterações para sua segurança)
```

---

## Como o usuário preenche o perfil

```
┌──────────────────────────────────────────────────────────────────┐
│  TELA: Meu Perfil                                                │
├──────────────────────────────────────────────────────────────────┤
│  📋 Dados Básicos                                                │
│     Nome/apelido, data de nascimento, tipo de diabetes           │
│     Peso, altura → IMC calculado automaticamente                 │
│     Dispositivo: caneta meia unidade / bomba / seringa           │
│                                                                  │
│  💉 Minhas Insulinas                                             │
│     Basal: ex: Lantus 20U às 22h (caneta descartável)           │
│     Bolus: ex: NovoRapid — caneta de meia unidade               │
│                                                                  │
│  💊 Meus Remédios                                                │
│     ex: Metformina 500mg 2x/dia com refeição                    │
│     ex: Jardiance 10mg 1x/dia de manhã                          │
│                                                                  │
│  ⚙️ Parâmetros de Cálculo (da sua prescrição médica)            │
│     ICR Manhã: 1U cobre __ g de carb                           │
│     ISF Manhã: 1U baixa __ mg/dL                               │
│     Glicemia Alvo: __ mg/dL                                     │
│     Duração da insulina: __ horas                               │
│                                                                  │
│  📊 Histórico de Exames                                          │
│     HbA1c, pressão, colesterol — registro manual ao longo do    │
│     tempo para acompanhar sua evolução                          │
└──────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Os parâmetros ICR, ISF e Alvo devem ser os valores que seu médico prescreveu.
> Digite-os exatamente como recebeu. O app usa esses valores para calcular sua dose.**

---

## Ordem de Execução das Migrations

```bash
mysql -u root -p nome_do_banco < migrations/001_create_users_and_patients.sql
mysql -u root -p nome_do_banco < migrations/002_create_insulin_profiles.sql
mysql -u root -p nome_do_banco < migrations/003_create_glucose_meals_bolus.sql
mysql -u root -p nome_do_banco < migrations/004_create_exercise_alerts_audit_food.sql
mysql -u root -p nome_do_banco < migrations/005_create_patient_full_profile.sql

# Seeds (banco de alimentos)
mysql -u root -p nome_do_banco < seeds/001_seed_food_database.sql
```

---

## Resumo das Tabelas

| # | Tabela | Preenchido por | O que é |
|---|--------|---------------|---------|
| 1 | `users` | Sistema | Login e senha |
| 2 | `patients` | Você | Nome, peso, altura, tipo de DM, dispositivo |
| 3 | `patient_insulins` | Você | Insulinas que você toma (basal e bolus) |
| 4 | `patient_medications` | Você | Outros remédios e suplementos |
| 5 | `patient_health_metrics` | Você | Exames: HbA1c, pressão, colesterol, peso |
| 6 | `patient_comorbidities` | Você | Outras condições de saúde |
| 7 | `insulin_profiles` | Você | Seus parâmetros de cálculo (da prescrição) |
| 8 | `insulin_profile_segments` | Você | ICR + ISF + Alvo por horário do dia |
| 9 | `glucose_readings` | CGM/App | Leituras de glicemia |
| 10 | `meals` | Você | Refeições registradas |
| 11 | `bolus_events` | App | Histórico de cálculos de dose |
| 12 | `exercise_events` | Você | Atividades físicas |
| 13 | `alerts` | App | Avisos automáticos (hipo, hiper, etc.) |
| 14 | `audit_log` | App | Histórico de alterações |
| 15 | `food_database` | App/Admin | Banco de alimentos TACO + USDA |
| 16 | `meal_templates` | Você | Refeições favoritas salvas |



```
users ──────────────────────────────────────────────────────────────────────────
  │ 1
  │
  └──── N patients  (dados físicos: peso, altura, IMC automático, tipo DM)
            │ 1
            │
            ├──── N patient_insulins          ← Insulinas em uso (basal, bolus)
            │
            ├──── N patient_medications       ← Outros medicamentos (oral, injetável)
            │
            ├──── N patient_health_metrics    ← HbA1c, pressão, colesterol, peso
            │
            ├──── N patient_comorbidities     ← Hipertensão, nefropatia, etc.
            │
            ├──── N patient_doctors           ← Médicos vinculados + permissões
            │
            ├──── N insulin_profiles          ← Perfil ativo de cálculo
            │         │ 1
            │         └──── N insulin_profile_segments
            │                   (ICR + ISF + Alvo por horário — MÉDICO)
            │
            ├──── N glucose_readings          ← CGM / capilar (série temporal)
            │
            ├──── N meals                     ← Refeições + macros + FPU
            │         └──── N bolus_events    ← Cálculos + doses + snapshot auditoria
            │
            ├──── N exercise_events           ← Atividades físicas + janela ISF
            │
            ├──── N alerts                    ← INFO / WARNING / CRITICAL
            │
            └──── N meal_templates            ← Refeições favoritas

food_database (global — não vinculada a paciente)
audit_log     (global — registra toda alteração clínica)
```

---

## Mapa de Responsabilidade: Quem preenche o quê?

```
┌─────────────────────────────────────┬─────────────────────────────────────────┐
│  PACIENTE preenche                  │  MÉDICO (endocrinologista) define        │
├─────────────────────────────────────┼─────────────────────────────────────────┤
│  • Nome, data de nascimento         │  • ICR (Relação Insulina:Carb)           │
│  • Peso, altura (IMC automático)    │  • ISF (Fator de Sensibilidade)          │
│  • Tipo de diabetes                 │  • Glicemia Alvo por período             │
│  • Medicamentos que toma            │  • DIA (Duração da Ação da Insulina)     │
│  • Insulinas que usa                │  • Dose máxima por bolus                 │
│  • Comorbidades conhecidas          │  • Limiar de hipoglicemia                │
│  • Médicos vinculados               │  • Taxa basal (para bombas)              │
│  • Alergias, histórico clínico      │  • Qualquer parâmetro de cálculo         │
│  • Refeições e glicemias            │                                          │
│  • Exercícios                       │  ⚠️ O sistema NUNCA altera esses         │
│                                     │     parâmetros automaticamente           │
└─────────────────────────────────────┴─────────────────────────────────────────┘
```

---

## Ordem de Execução das Migrations

```bash
mysql -u root -p nome_do_banco < migrations/001_create_users_and_patients.sql
mysql -u root -p nome_do_banco < migrations/002_create_insulin_profiles.sql
mysql -u root -p nome_do_banco < migrations/003_create_glucose_meals_bolus.sql
mysql -u root -p nome_do_banco < migrations/004_create_exercise_alerts_audit_food.sql
mysql -u root -p nome_do_banco < migrations/005_create_patient_full_profile.sql

# Seeds (desenvolvimento)
mysql -u root -p nome_do_banco < seeds/001_seed_food_database.sql
```

---

## Resumo das Tabelas

| # | Tabela | Migration | Preenchido por | Descrição |
|---|--------|-----------|---------------|-----------|
| 1 | `users` | 001 | Sistema | Autenticação e controle de acesso |
| 2 | `patients` | 001+005 | Paciente | Dados pessoais e clínicos básicos |
| 3 | **`patient_insulins`** | 005 | Paciente | Insulinas em uso (basal, bolus, tipo, device) |
| 4 | **`patient_medications`** | 005 | Paciente | Medicamentos (orais, injetáveis, suplementos) |
| 5 | **`patient_health_metrics`** | 005 | Paciente/Lab | HbA1c, pressão, colesterol, peso, cetonas |
| 6 | **`patient_comorbidities`** | 005 | Paciente | Hipertensão, nefropatia, gastroparesia, etc. |
| 7 | **`patient_doctors`** | 005 | Paciente | Médicos vinculados + permissões de acesso |
| 8 | `insulin_profiles` | 002 | **Médico** | Perfil ativo de insulina (DIA, tipo, device) |
| 9 | `insulin_profile_segments` | 002 | **Médico** | **ICR + ISF + Alvo por horário** |
| 10 | `glucose_readings` | 003 | CGM/Dispositivo | Série temporal de glicemia |
| 11 | `meals` | 003 | Paciente | Refeições com macros e FPU |
| 12 | `bolus_events` | 003 | Sistema | Cálculos + snapshot imutável (IEC 62304) |
| 13 | `exercise_events` | 004 | Paciente | Atividades físicas e janela de sensibilidade |
| 14 | `alerts` | 004 | Sistema | Alertas clínicos INFO/WARNING/CRITICAL |
| 15 | `audit_log` | 004 | Sistema | Trilha imutável APPEND-ONLY |
| 16 | `food_database` | 004 | Sistema/Admin | TACO + USDA (macros, IG, FPU) |
| 17 | `meal_templates` | 004 | Paciente | Refeições favoritas pré-definidas |

---

## Segurança e Conformidade

### Dados Sensíveis (LGPD Art. 11)
- `patients.first_name`, `last_name`, `date_of_birth` — **criptografar em repouso** (AES-256 na camada de aplicação antes do INSERT)
- `users.email` — hash para busca + versão criptografada
- `users.two_factor_secret` — AES-256 obrigatório

### Soft Delete
- `users.deleted_at` e `patients.deleted_at` — nunca deletar hard
- Ao exportar/anonimizar: substituir dados pessoais por tokens irreversíveis

### Tabelas Imutáveis (APPEND-ONLY)
- `bolus_events` — **nunca UPDATE ou DELETE**
- `audit_log` — **nunca UPDATE ou DELETE**

### Constraints de Segurança Clínica (CHECK)
- `insulin_profile_segments.icr` → BETWEEN 2.0 AND 100.0 g/U
- `insulin_profile_segments.isf` → BETWEEN 5.0 AND 200.0 mg/dL/U
- `insulin_profile_segments.target_glucose` → BETWEEN 70.0 AND 200.0 mg/dL
- `insulin_profiles.dia_hours` → BETWEEN 2.0 AND 8.0 horas
- `insulin_profiles.max_single_dose` → BETWEEN 0.05 AND 25.0 U
- `bolus_events.iob_at_time` → >= 0.0 (IOB nunca negativo)
- `glucose_readings.glucose_value` → BETWEEN 20.0 AND 700.0 mg/dL

---

## Views (pasta /views)

Criar posteriormente:

- `v_patient_active_profile` — perfil ativo atual com segmento horário vigente
- `v_iob_history` — bolus entregues nas últimas 8h para cálculo de IOB
- `v_glucose_last_24h` — leituras de glicemia das últimas 24h por paciente
- `v_time_in_range` — TIR calculado por período (semanal/mensal)
- `v_daily_bolus_summary` — resumo diário de doses e correções
